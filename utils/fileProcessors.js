// fileProcessors.js
import fetch from "node-fetch";
import { OpenAI } from "openai";
import { PDFDocument } from "pdf-lib";
import fs from "node:fs/promises";

// Initialize OpenAI client
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY, // Make sure to set this environment variable
});

/**
 * Process factory that returns the appropriate processor based on file type
 * @param {string} fileType - MIME type of the file
 * @returns {Object} - Processor object with process method
 */
export function getFileProcessor(fileType) {
  const processors = {
    "application/pdf": new PdfProcessor(),
    // Add audio processors
    "audio/mpeg": new AudioProcessor(),
    "audio/mp3": new AudioProcessor(),
    "audio/wav": new AudioProcessor(),
    "audio/x-m4a": new AudioProcessor(),
    "audio/m4a": new AudioProcessor(),
    "audio/mp4": new AudioProcessor(),
    "audio/x-wav": new AudioProcessor(),
  };

  return processors[fileType] || new DefaultProcessor();
}

/**
 * Base processor class with common methods
 */
class FileProcessor {
  async process(fileUrl, options = {}) {
    throw new Error("Process method must be implemented by subclasses");
  }

  /**
   * Download file content from URL
   */
  async downloadFile(url) {
    // url = "https://uwgm32kt40oar3yw.public.blob.vercel-storage.com/lec-g3kRtkekLpk2dpYN3gWxOHvIm3DX0m.pdf"
    

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to download file: ${response.status} ${response.statusText}`
      );
    }
    return response.buffer();
  }

  /**
   * Update process status
   */
  async updateStatus(materialId, status, prisma) {
    // Log status update for debugging
    console.log(`Updating material ${materialId} status to: ${status}`);

    try {
      const result = await prisma.material.update({
        where: { id: materialId },
        data: { status },
      });
      console.log(`Status updated successfully for ${materialId}`);
      return result;
    } catch (error) {
      console.error(
        `Failed to update status for material ${materialId}:`,
        error
      );
      throw error;
    }
  }
}

const buildClassificationPrompt = (pages) => `
You are a meticulous document-processing assistant.
KEEP a page if it looks like substantive content.
SKIP a page if it is a cover, table of contents, blank, index, ads, license, etc.

Return your response as valid JSON array with the following format:
[
  {
    "index": <number of the page>,
    "keep": true|false
  }
]

USER:
Here are the page candidates:

${pages
  .map(
    (p, index) =>
      `Page ${index}:\n"""${p.short_description
        .replace(/\n+/g, " ")
        .slice(0, 500)} topic of the page: ${p.topic}"""`
  )
  .join("\n\n")}
`;

/**
 * PDF Processor using OpenAI API
 */
class PdfProcessor extends FileProcessor {
  async process(fileUrl, { materialId, prisma, updateProgress }) {
    try {

      // REACHED PROCESS IN FILE PROCESSOR
      // Log processing start for tracking
      console.log(
        `Starting processing for material ID: ${materialId}, URL: ${fileUrl}`
      );

      // Update status to processing
      await this.updateStatus(materialId, "processing", prisma);

      if (updateProgress) updateProgress(20, "Downloading PDF file...");

      // Download the PDF
      const pdfBuffer = await this.downloadFile(fileUrl);
      console.log(
        `PDF downloaded successfully for ${materialId}, size: ${pdfBuffer.length} bytes`
      );

      if (updateProgress)
        updateProgress(40, "Sending PDF to OpenAI for processing...");

      // Update status to reflect the current step
      await this.updateStatus(materialId, "Converting to text", prisma);
      
      // Extract text and generate description in a single API call
      const rawResults = await this.processWithOpenAI(
        pdfBuffer
      );
      console.log(rawResults);
      
      // console.log(`Processing completed for ${materialId}, extracted text length: ${results.results?.length} chars`);

      
      const extractedText = rawResults.map((r) => r.extracted_text || "");
      const description = rawResults.map((r) => r.short_description || "");
      const topic = rawResults.map((r) => r.topic || "");
      
      const mergedText = extractedText
        .filter(text => text && text.trim()) // Remove empty/null text
        .map((text, i) => `<page-${i + 1}>${text}</page-${i + 1}>`)
        .join("\n");

      const mergedDescription = description
        .filter(desc => desc && desc.trim()) // Remove empty/null descriptions
        .map((desc, i) => `<page-${i + 1}>${desc}</page-${i + 1}>`)
        .join("\n");

      const mergedTopic = topic
        .filter(topicItem => topicItem && topicItem.trim()) // Remove empty/null topics
        .map((topicItem, i) => `<page-${i + 1}>${topicItem}</page-${i + 1}>`)
        .join("\n");

      console.log("Merged Text:\n", mergedText); 
      console.log("Merged Description:\n", mergedDescription);
      console.log("Merged Topic:\n", mergedTopic);
      
      if (updateProgress) updateProgress(80, "Storing processed content...");


      // Save the extracted text and description to the database
      await prisma.material.update({
        where: { id: materialId },
        data: {
          rawContent: mergedText,
          description: mergedDescription,
          topic: mergedTopic, // add topic attribute
          status: "Ready", // Use consistent status naming
        }
      });
      console.log(`Processing completed for ${materialId}`);


      if (updateProgress) updateProgress(100, "Processing complete");

      return {
        success: true,
        text: mergedText,
        description: mergedDescription,
        mergedTopic: mergedTopic,
      };
    } catch (error) {
      console.error(`PDF processing error for ${materialId}:`, error);

      // Update status to error
      try {
        await this.updateStatus(materialId, "error", prisma);
      } catch (statusError) {
        console.error(
          `Failed to update error status for ${materialId}:`,
          statusError
        );
      }

      if (updateProgress) updateProgress(100, "Error processing file");

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Split PDF into individual pages and return as base64 strings
   * @param {string} inputPath - Path to the PDF file
   * @return {Promise<Array>} - Array of objects with page number and base64 content
   * */
  async splitPdf(pdfBuffer) {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();
  
    let pdfPages = [];
  
    for (let i = 0; i < pageCount; i++) {
      // Create a new PDF with just this page
      const newPdf = await PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
      newPdf.addPage(copiedPage);
  
      const pdfBytes = await newPdf.save();
      const base64String = Buffer.from(pdfBytes).toString("base64");
  
      pdfPages.push({
        page: i + 1,
        base64: base64String,
      });
    }
  
    return pdfPages;
  }
  /**
   * Build batch tasks for OpenAI API
   * @param {Array} pdfPages - Array of objects with page number and base64 content
   * @return {Promise<Object>} - Object containing tasks array and JSONL buffer
   * */
  async buildBatchTasks(pdfPages, ANALYSIS_SCHEMA, PROMPT) {
    console.log(`Building batch tasks for ${pdfPages.length} pages`);
  
    const tasks = [];
  
    for (const { page, base64 } of pdfPages) {
      const task = {
        custom_id: page.toString(),
        method: "POST",
        url: "/v1/chat/completions",
        body: {
          model: "gpt-4o",
          response_format: {
            type: "json_schema",
            json_schema: ANALYSIS_SCHEMA,
          },
          messages: [
            {
              role: "system",
              content: PROMPT,
            },
            {
              role: "user",
              content: [
                {
                  type: "file",
                  file: {
                    file_data: `data:application/pdf;base64,${base64}`,
                    filename: "document.pdf",
                  },
                },
              ],
            },
          ],
        },
      };
      tasks.push(task);
    }
  
    // Create JSONL buffer instead of writing to file
    const jsonlContent = tasks.map((task) => JSON.stringify(task)).join("\n");
    const jsonlBuffer = Buffer.from(jsonlContent, 'utf8');
    console.log(`Created ${tasks.length} tasks in buffer`);
  
    return { tasks, jsonlBuffer };
  }
  
  /**
   * Upload batch tasks to OpenAI for processing
   * @param {Buffer} jsonlBuffer - Buffer containing the JSONL batch tasks
   * @return {Promise<string>} - Batch ID from OpenAI
   */
  async uploadBatchTasks(jsonlBuffer) {
    try {
      console.log(`Uploading batch tasks from buffer...`);
  
      // Create a readable stream from the buffer
      const { Readable } = await import('stream');
      const stream = new Readable({
        read() {}
      });
      stream.push(jsonlBuffer);
      stream.push(null); // End the stream
  
      // Upload the buffer as a stream
      const file = await openai.files.create({
        file: stream,
        purpose: "batch",
      });
  
      console.log(`File uploaded with ID: ${file.id}`);
  
      // Create the batch job
      const batch = await openai.batches.create({
        input_file_id: file.id,
        endpoint: "/v1/chat/completions",
        completion_window: "24h",
      });
  
      console.log(`Batch created with ID: ${batch.id}`);
      console.log(`Status: ${batch.status}`);
  
      return batch.id;
    } catch (error) {
      console.error("Error uploading batch tasks:", error);
      throw error;
    }
  }
  /**
   * Retrieve the status and results of a batch job
   * @param {string} batchId - The batch ID to check
   * @returns {Promise<Object>} - Batch status and results with buffer
   */
  async retrieveBatchResults(batchId) {
    try {
      console.log(`Checking batch status for ID: ${batchId}`);
  
      // Get batch status
      const batch = await openai.batches.retrieve(batchId);
      console.log(`Batch Status: ${batch.status}`);
      console.log(
        `Created at: ${new Date(batch.created_at * 1000).toISOString()}`
      );
  
      if (batch.status === "completed") {
        console.log(
          `Completed at: ${new Date(batch.completed_at * 1000).toISOString()}`
        );
        console.log(
          `Request counts - Total: ${batch.request_counts.total}, Completed: ${batch.request_counts.completed}, Failed: ${batch.request_counts.failed}`
        );
  
        if (batch.output_file_id) {
          // Download the results
          const fileResponse = await openai.files.content(batch.output_file_id);
          const results = await fileResponse.text();
  
          // Create buffer from results instead of writing to file
          const resultsBuffer = Buffer.from(results, 'utf8');
          console.log(`Results stored in buffer`);
  
          // Parse and return results
          const parsedResults = results
            .trim()
            .split("\n")
            .map((line) => JSON.parse(line));
  
          return {
            batch,
            results: parsedResults,
            rawResults: results,
            resultsBuffer,
          };
        }
      } else if (batch.status === "failed") {
        console.error("Batch processing failed");
        if (batch.errors) {
          console.error("Errors:", batch.errors);
        }
      } else {
        console.log("Batch is still processing...");
      }
  
      return { batch, results: null };
    } catch (error) {
      console.error("Error retrieving batch results:", error);
      throw error;
    }
  }
  /**
   * Poll batch status until completion
   * @param {string} batchId - The batch ID to monitor
   * @param {number} intervalMs - Polling interval in milliseconds (default: 30 seconds)
   * @returns {Promise<Object>} - Final batch results with buffer
   */
  async waitForBatchCompletion(
    batchId,
    intervalMs = 30000
  ) {
    console.log(`Monitoring batch ${batchId} for completion...`);

    while (true) {
      const result = await this.retrieveBatchResults(batchId);

      if (result.batch.status === "completed") {
        console.log("Batch processing completed successfully!");
        return result;
      } else if (
        result.batch.status === "failed" ||
        result.batch.status === "expired" ||
        result.batch.status === "cancelled"
      ) {
        throw new Error(
          `Batch processing failed with status: ${result.batch.status}`
        );
      }

      console.log(`Waiting ${intervalMs / 1000} seconds before next check...`);
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  /**
   * Process PDF with OpenAI API to extract text and generate description in one call
   */
  async processWithOpenAI(pdfBuffer) {
    // Define the JSON schema for structured output
    const ANALYSIS_SCHEMA = {
      name: "pdf_analysis_schema",
      strict: true,
      schema: {
        type: "object",
        properties: {
          extracted_text: { type: "string" },
          short_description: { type: "string" },
          topic: { type: "string" },
        },
        required: ["extracted_text", "short_description", "topic"],
        additionalProperties: false,
      },
    };
    try {
      // Convert buffer to base64 for OpenAI API
      const base64Pdf = pdfBuffer.toString("base64");
      const PROMPT =
      "You are a PDF content extractor that provides responses in JSON format only. When processing a PDF document:" +
      "\n1. Extract ALL text content including headers, paragraphs, bullets, footnotes, and captions." +
      "\n2. Pay special attention to images, graphs, tables, charts, and diagrams - describe their content in detail within the text. Include numerical data from tables, axis labels from charts, and key information from diagrams." +
      "\n3. Create a very concise description (maximum 4 sentences) of what this document is about." +
      "\n4. Always maintain the document's structure and formatting as much as possible." +
      "\nReturn your response as valid JSON with the following properties:" +
      "\n{" +
      '\n  "extracted_text": "The full extracted text with all content including descriptions of visual elements",' +
      '\n  "short_description": "A concise 1-2 sentence description of the document"' +
      '\n  "topic": "The main topic or subject of the document, e.g.,"' +
      "\n}" +
      "\nDO NOT include any text, markdown formatting, or explanation outside the JSON structure. AND DO NOT SUMMARIZE ANYTHING";      // Split PDF into individual pages
      const pdfPages = await this.splitPdf(pdfBuffer);

      console.log(`${pdfPages.length} PDF pages created.`);

      // Build batch tasks for each page
      const { tasks, jsonlBuffer } = await this.buildBatchTasks(pdfPages, ANALYSIS_SCHEMA, PROMPT);
      console.log(`Created ${tasks.length} batch tasks.`);
      
      // Upload batch tasks using buffer
      const batchId = await this.uploadBatchTasks(jsonlBuffer);
      console.log(`Batch uploaded with ID: ${batchId}`);

      // Wait for completion
      const results = await this.waitForBatchCompletion(
        batchId,
        10 * 1000
      );
      console.log(`Processing completed! Results stored in buffer`);
      console.log(`Total results: ${results.results?.length || 0}`);
      // From inside results => rawResults => we have list of objects, we need extracted_text, short_description, topic
      const rawResults = results.rawResults;
      
      // Parse the raw results string into an array of JSON objects
      const parsedResults = rawResults
        .trim()
        .split('\n')
        .map(line => JSON.parse(line))
        .map(item => JSON.parse(item.response.body.choices[0].message.content));
      
      return parsedResults;
    } catch (error) {
      console.error("Error using OpenAI API:", error);
      throw new Error(
        `Failed to process PDF using OpenAI API: ${error.message}`
      );
    }
  }
}

/**
 * Audio Processor using OpenAI Whisper API
 */
class AudioProcessor extends FileProcessor {
  async process(fileUrl, { materialId, prisma, updateProgress }) {
    try {
      // Log processing start for tracking
      console.log(
        `Starting audio processing for material ID: ${materialId}, URL: ${fileUrl}`
      );

      // Update status to processing
      await this.updateStatus(materialId, "processing", prisma);

      if (updateProgress) updateProgress(20, "Downloading audio file...");

      // Download the audio file
      const audioBuffer = await this.downloadFile(fileUrl);
      console.log(
        `Audio downloaded successfully for ${materialId}, size: ${audioBuffer.length} bytes`
      );

      if (updateProgress)
        updateProgress(
          40,
          "Sending audio to OpenAI Whisper for transcription..."
        );

      // Update status to reflect the current step
      await this.updateStatus(materialId, "Transcribing audio", prisma);

      // Transcribe audio and generate description in a single API call
      const { transcribedText, description } = await this.transcribeWithWhisper(
        audioBuffer
      );

      console.log(
        `Audio transcribed successfully for ${materialId}, length: ${transcribedText.length} chars`
      );
      console.log(`Description generated for ${materialId}: ${description}`);

      if (updateProgress) updateProgress(80, "Storing transcribed content...");

      // Save the transcribed text and description to the database
      await prisma.material.update({
        where: { id: materialId },
        data: {
          rawContent: transcribedText,
          description: description,
          status: "Ready", // Use consistent status naming
        },
      });
      console.log(`Processing completed for ${materialId}`);

      if (updateProgress) updateProgress(100, "Processing complete");

      return {
        success: true,
        text: transcribedText,
        description: description,
      };
    } catch (error) {
      console.error(`Audio processing error for ${materialId}:`, error);

      // Update status to error
      try {
        await this.updateStatus(materialId, "error", prisma);
      } catch (statusError) {
        console.error(
          `Failed to update error status for ${materialId}:`,
          statusError
        );
      }

      if (updateProgress) updateProgress(100, "Error processing file");

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Transcribe audio with OpenAI Whisper API and generate description
   */
  async transcribeWithWhisper(audioBuffer) {
    try {
      // Create a FormData object with the audio file for the OpenAI API
      // First, we need to create a temporary file for the audio buffer
      const formData = new FormData();
      const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });
      formData.append("file", audioBlob, "audio.mp3");
      formData.append("model", "whisper-1");
      formData.append("response_format", "verbose_json");

      // Call OpenAI Whisper API to transcribe audio
      const transcriptionResponse = await openai.audio.transcriptions.create({
        file: new File([audioBuffer], "audio.mp3", { type: "audio/mpeg" }),
        model: "whisper-1",
        response_format: "verbose_json",
      });

      const transcribedText = transcriptionResponse.text || "";

      // Generate a description from the transcribed text
      let description = "Audio transcription";

      // Only attempt to generate a description if we have enough transcribed text
      if (transcribedText && transcribedText.length > 50) {
        try {
          // Use GPT to generate a brief description of the audio content
          const descriptionResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content:
                  "Generate a very concise description (maximum 2 sentences) of what this audio transcription is about.",
              },
              {
                role: "user",
                content: transcribedText.substring(0, 1000), // Use first 1000 chars to generate description
              },
            ],
            max_tokens: 100,
          });

          description = descriptionResponse.choices[0].message.content.trim();
        } catch (descError) {
          console.error("Error generating description:", descError);
          // Fall back to default description
        }
      }

      return { transcribedText, description };
    } catch (error) {
      console.error("Error using OpenAI Whisper API:", error);
      throw new Error(
        `Failed to transcribe audio using Whisper API: ${error.message}`
      );
    }
  }
}

/**
 * Default processor for unsupported file types
 */
class DefaultProcessor extends FileProcessor {
  async process(fileUrl, { materialId, prisma }) {
    await this.updateStatus(materialId, "unsupported", prisma);
    return {
      success: false,
      error: "Unsupported file type",
    };
  }
}

/**
 * Process a file based on its type
 * @param {string} fileUrl - URL to the file
 * @param {string} fileType - MIME type of the file
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Processing result
 */
export async function processFile(fileUrl, fileType, options = {}) {
  console.log(
    `Processing file of type ${fileType}, materialId: ${options.materialId}`
  );
  const processor = getFileProcessor(fileType);
  return processor.process(fileUrl, options);
}
