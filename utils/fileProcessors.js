// fileProcessors.js
import fetch from "node-fetch";
import { OpenAI } from "openai";
import { PDFDocument } from "pdf-lib";
import fs from "node:fs/promises";
import fsSync from "node:fs";

// Initialize OpenAI client
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
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
 * Process a file using the appropriate processor
 * @param {string} fileUrl - URL of the file to process
 * @param {string} fileType - MIME type of the file
 * @param {Object} options - Processing options including materialId, prisma, updateProgress
 * @returns {Promise<Object>} - Processing result
 */
export async function processFile(fileUrl, fileType, options = {}) {
  try {
    console.log(`Processing file: ${fileUrl}, type: ${fileType}`);

    // Get the appropriate processor for this file type
    const processor = getFileProcessor(fileType);

    // Process the file with the selected processor
    const result = await processor.process(fileUrl, options);

    console.log(
      `File processing completed for ${options.materialId || "unknown"}`
    );
    return result;
  } catch (error) {
    console.error(`Error processing file ${fileUrl}:`, error);

    // Update status to error if materialId and prisma are provided
    if (options.materialId && options.prisma) {
      try {
        await options.prisma.material.update({
          where: { id: options.materialId },
          data: { status: "Error" },
        });
      } catch (statusError) {
        console.error(`Failed to update error status:`, statusError);
      }
    }

    throw error;
  }
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

/**
 * PDF Processor using OpenAI API
 */
class PdfProcessor extends FileProcessor {
  async process(fileUrl, { materialId, prisma, updateProgress }) {
    try {
      // Log processing start for tracking
      console.log(
        `Starting processing for material ID: ${materialId}, URL: ${fileUrl}`
      );

      // Update status to processing
      await this.updateStatus(materialId, "Processing", prisma);

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

      // Create a batch request instead of synchronous processing
      const batchId = await this.createBatchRequest(pdfBuffer, materialId);
      console.log(
        `Created batch request with ID: ${batchId} for material ${materialId}`
      );

      // Update the material with the batch ID and set status to batch created
      await prisma.material.update({
        where: { id: materialId },
        data: {
          batchId: batchId,
          status: "Batch Created",
        },
      });

      if (updateProgress) updateProgress(60, "Batch created successfully");

      console.log(
        `Batch processing initiated for material ${materialId}. Batch ID: ${batchId}`
      );

      // Return early - the batch will be processed asynchronously
      return {
        success: true,
        batchId: batchId,
        message: "Batch processing initiated",
      };
    } catch (error) {
      console.error(`PDF processing error for ${materialId}:`, error);

      // Update status to error
      try {
        await this.updateStatus(materialId, "Error", prisma);
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
   * Retrieve the status and results of a batch job
   * @param {string} batchId - The batch ID to check
   * @param {string} outputFile - Optional file to save results to
   * @returns {Promise<Object>} - Batch status and results
   */
  async retrieveBatchResults(batchId, outputFile = null) {
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

          if (outputFile) {
            await fs.writeFile(outputFile, results);
            console.log(`Results saved to ${outputFile}`);
          }

          // Parse and return results
          const parsedResults = results
            .trim()
            .split("\n")
            .map((line) => JSON.parse(line));

          return {
            batch,
            results: parsedResults,
            rawResults: results,
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
   * @param {string} outputFile - Optional file to save results to
   * @returns {Promise<Object>} - Final batch results
   */
  async waitForBatchCompletion(batchId, intervalMs = 30000, outputFile = null) {
    console.log(`Monitoring batch ${batchId} for completion...`);

    while (true) {
      const result = await this.retrieveBatchResults(batchId, outputFile);

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
   * Create a batch request for PDF processing
   */
  async createBatchRequest(pdfBuffer, materialId) {
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
      "\nDO NOT include any text, markdown formatting, or explanation outside the JSON structure. AND DO NOT SUMMARIZE ANYTHING";
    try {
      // Split PDF into pages
      const pages = await this.splitPdf(pdfBuffer);
      console.log(
        `Split PDF into ${pages.length} pages for material ${materialId}`
      );

      // Create task for each page
      const tasks = [];

      for (const { pageNumber, base64 } of pages) {
        const task = {
          custom_id: pageNumber.toString(),
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
                      filename: "zoot.pdf",
                    },
                  },
                ],
              },
            ],
          },
        };
        tasks.push(task);
      }
      console.log(`Created ${tasks.length} batch tasks.`);

      // Create a file with the batch requests
      const batchFile = tasks.map((req) => JSON.stringify(req)).join("\n");

      // Upload the batch file to OpenAI
      const file = await openai.files.create({
        file: new File([batchFile], `batch-${materialId}.jsonl`, {
          type: "application/jsonl",
        }),
        purpose: "batch",
      });
      console.log(`File uploaded with ID: ${file.id}`);
      console.log(`Uploaded batch file ${file.id} for material ${materialId}`);

      // Create the batch
      const batch = await openai.batches.create({
        input_file_id: file.id,
        endpoint: "/v1/chat/completions",
        completion_window: "24h",
        metadata: {
          materialId: materialId,
          description: `PDF processing for material ${materialId}`,
        },
      });

      console.log(`Created batch ${batch.id} for material ${materialId}`);
      return batch.id;
    } catch (error) {
      console.error(
        `Error creating batch request for material ${materialId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Process completed batch results
   */
  async processBatchResults(material, results, prisma) {
    try {
      console.log(`Processing batch results for material ${material.id}`);

      // Extract the response content from batch results
      const rawResults = results
        .map((result) => {
          if (
            result.response &&
            result.response.body &&
            result.response.body.choices
          ) {
            const content = result.response.body.choices[0]?.message?.content;
            if (content) {
              try {
                return JSON.parse(content);
              } catch (e) {
                console.error("Failed to parse batch result content:", e);
                return null;
              }
            }
          }
          return null;
        })
        .filter(Boolean);

      if (rawResults.length === 0) {
        throw new Error("No valid results found in batch response");
      }

      // Include ALL pages - no filtering, include all content with metadata and nice formatting
      const mergedText = rawResults
        .map((result, index) => {
          const pageNumber = index + 1;
          const text = result.extracted_text || "";
          const description = result.short_description || "";
          const topic = result.topic || "";

          return `<PAGE-${pageNumber}>
<!-- METADATA -->
<!-- TOPIC: ${topic} -->
<!-- DESCRIPTION: ${description} -->
<!-- END METADATA -->

${text}
</PAGE-${pageNumber}>`;
        })
        .filter((text) => text && text.trim())
        .join("\n\n");

      console.log("Merged Text with metadata created");

      // Generate a comprehensive, readable title and description from all pages
      const allTopics = rawResults.map((r) => r.topic || "").filter(Boolean);
      const allDescriptions = rawResults
        .map((r) => r.short_description || "")
        .filter(Boolean);

      // Filter out irrelevant topics (title pages, table of contents, etc.)
      const filteredTopics = this.filterRelevantTopics(allTopics);
      console.log("Filtered topics:", filteredTopics);

      const titleDescriptionPrompt = `Based on the following content from a document, generate:
1. A clear, descriptive title (5-12 words, suitable for a study material)
2. A comprehensive description (2-3 sentences explaining what this document covers)

Page Topics:
${allTopics.map((topic, i) => `Page ${i + 1}: ${topic}`).join("\n")}

Page Descriptions:
${allDescriptions.map((desc, i) => `Page ${i + 1}: ${desc}`).join("\n")}

Return your response as JSON:
{
  "title": "...",
  "description": "..."
}`;

      let finalTitle = "Study Material";
      let finalDescription = "Comprehensive study content";

      try {
        const titleResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: titleDescriptionPrompt }],
          temperature: 0.3,
          max_tokens: 500,
          response_format: { type: "json_object" },
        });

        const titleResult = JSON.parse(
          titleResponse.choices[0].message.content.trim()
        );
        finalTitle = titleResult.title || finalTitle;
        finalDescription = titleResult.description || finalDescription;
      } catch (titleError) {
        console.error("Error generating title/description:", titleError);
        // Fallback: use the first page's topic as title
        finalTitle = allTopics[0] || "Study Material";
        finalDescription = allDescriptions[0] || "Comprehensive study content";
      }

      console.log("Final Title:", finalTitle);
      console.log("Final Description:", finalDescription);

      // Update the material with the processed content
      await prisma.material.update({
        where: { id: material.id },
        data: {
          rawContent: mergedText,
          title: finalTitle,
          description: finalDescription,
          topics: filteredTopics, // Store filtered topics as array
          status: "Ready",
        },
      });

      console.log(
        `Successfully processed batch results for material ${material.id}`
      );
    } catch (error) {
      console.error(
        `Error processing batch results for material ${material.id}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Filter out irrelevant topics like title pages, table of contents, etc.
   * @param {Array} topics - Array of topic strings
   * @returns {Array} - Filtered array of relevant topics
   */
  filterRelevantTopics(topics) {
    const irrelevantKeywords = [
      "title page",
      "table of contents",
      "toc",
      "contents",
      "introduction",
      "preface",
      "acknowledgments",
      "bibliography",
      "references",
      "index",
      "appendix",
      "cover page",
      "front matter",
      "back matter",
      "copyright",
      "disclaimer",
      "about the author",
      "foreword",
    ];

    const duplicateTracker = new Set();

    return topics
      .filter((topic) => {
        if (!topic || topic.trim().length < 3) return false;

        const lowerTopic = topic.toLowerCase().trim();

        // Filter out topics that contain irrelevant keywords
        const isIrrelevant = irrelevantKeywords.some((keyword) =>
          lowerTopic.includes(keyword.toLowerCase())
        );

        if (isIrrelevant) return false;

        // Remove duplicates (case-insensitive)
        if (duplicateTracker.has(lowerTopic)) return false;
        duplicateTracker.add(lowerTopic);

        return true;
      })
      .slice(0, 10); // Limit to max 10 topics to avoid overwhelming the database
  }

  /**
   * Split PDF into individual pages and return as base64 strings
   * @param {Buffer} pdfBuffer - PDF file buffer
   * @return {Promise<Array>} - Array of objects with page number and base64 content
   */
  async splitPdf(pdfBuffer) {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pageCount = pdfDoc.getPageCount();
      const pages = [];

      for (let i = 0; i < pageCount; i++) {
        // Create a new PDF document for this page
        const newPdf = await PDFDocument.create();
        const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
        newPdf.addPage(copiedPage);

        // Convert the single page PDF to bytes
        const pdfBytes = await newPdf.save();

        // For now, we'll send the PDF page as base64 to OpenAI
        // OpenAI can handle PDF input directly
        const base64 = Buffer.from(pdfBytes).toString("base64");

        pages.push({
          pageNumber: i + 1,
          base64: base64,
        });
      }

      console.log(`Successfully split PDF into ${pages.length} pages`);
      return pages;
    } catch (error) {
      console.error("Error splitting PDF:", error);
      throw error;
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

      await this.updateStatus(materialId, "Processing", prisma);

      if (updateProgress) updateProgress(20, "Downloading audio file...");

      // Download the audio file
      const audioBuffer = await this.downloadFile(fileUrl);
      console.log(
        `Audio downloaded successfully for ${materialId}, size: ${audioBuffer.length} bytes`
      );

      if (updateProgress) updateProgress(40, "Transcribing audio...");

      await this.updateStatus(materialId, "Converting to text", prisma);

      // Transcribe audio and generate description in a single API call
      const { transcribedText, description, topics } =
        await this.transcribeWithWhisper(audioBuffer);

      console.log(
        `Audio transcribed successfully for ${materialId}, length: ${transcribedText.length} chars`
      );
      console.log(`Description generated for ${materialId}: ${description}`);
      console.log(`Topics extracted for ${materialId}:`, topics);

      if (updateProgress) updateProgress(80, "Storing transcription...");

      // Save the transcribed text and description to the database
      await prisma.material.update({
        where: { id: materialId },
        data: {
          rawContent: transcribedText,
          description: description,
          topics: topics, // Store extracted topics
          status: "Ready", // Use consistent status naming
        },
      });

      if (updateProgress) updateProgress(100, "Processing complete");

      return {
        success: true,
        text: transcribedText,
        description: description,
        topics: topics,
      };
    } catch (error) {
      console.error(`Audio processing error for ${materialId}:`, error);

      try {
        await this.updateStatus(materialId, "Error", prisma);
      } catch (statusError) {
        console.error(
          `Failed to update error status for ${materialId}:`,
          statusError
        );
      }

      if (updateProgress) updateProgress(100, "Error processing audio");

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
      let topics = [];

      // Only attempt to generate a description if we have enough transcribed text
      if (transcribedText && transcribedText.length > 50) {
        try {
          // Use GPT to generate a brief description and extract topics
          const analysisResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `Analyze this audio transcription and return a JSON response with:
1. A concise description (maximum 2 sentences)
2. A list of 3-5 main topics/subjects covered

Return only valid JSON in this format:
{
  "description": "Brief description of the content",
  "topics": ["topic1", "topic2", "topic3"]
}`,
              },
              {
                role: "user",
                content:
                  transcribedText.length > 2000
                    ? transcribedText.substring(0, 2000) + "..."
                    : transcribedText,
              },
            ],
            max_tokens: 200,
            temperature: 0.3,
            response_format: { type: "json_object" },
          });

          const analysis = JSON.parse(
            analysisResponse.choices[0].message.content.trim()
          );
          description = analysis.description || description;
          topics = Array.isArray(analysis.topics) ? analysis.topics : [];

          // Filter out any irrelevant topics
          topics = topics
            .filter(
              (topic) =>
                topic &&
                topic.trim().length > 2 &&
                !topic.toLowerCase().includes("transcription") &&
                !topic.toLowerCase().includes("audio")
            )
            .slice(0, 5); // Limit to 5 topics
        } catch (descError) {
          console.error("Error generating description and topics:", descError);
          // Fall back to default values
        }
      }

      return { transcribedText, description, topics };
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
  async process(fileUrl, { materialId, prisma, updateProgress }) {
    console.log(`Unsupported file type for material ${materialId}`);

    await this.updateStatus(materialId, "Unsupported", prisma);

    if (updateProgress) updateProgress(100, "Unsupported file type");

    return {
      success: false,
      error: "Unsupported file type",
    };
  }
}

/**
 * Filter raw content by selected topics
 * This function parses the <PAGE-X> formatted content and returns only pages
 * that match the specified topics
 *
 * @param {string} rawContent - The raw content in <PAGE-X> format with metadata
 * @param {Array<string>} selectedTopics - Array of topics to filter by
 * @param {boolean} exactMatch - Whether to use exact topic matching (default: false)
 * @returns {string} - Filtered raw content containing only matching pages
 */
export function filterContentByTopics(
  rawContent,
  selectedTopics,
  exactMatch = false
) {
  if (!rawContent || !selectedTopics || selectedTopics.length === 0) {
    return rawContent;
  }

  try {
    // Split content into individual pages
    const pageRegex = /<PAGE-(\d+)>([\s\S]*?)<\/PAGE-\1>/g;
    const pages = [];
    let match;

    while ((match = pageRegex.exec(rawContent)) !== null) {
      const pageNumber = match[1];
      const pageContent = match[2];

      // Extract topic from metadata
      const topicMatch = pageContent.match(/<!-- TOPIC: (.*?) -->/);
      const pageTopic = topicMatch ? topicMatch[1].trim() : "";

      pages.push({
        pageNumber: parseInt(pageNumber),
        content: match[0], // Full page content including tags
        topic: pageTopic,
        rawContent: pageContent,
      });
    }

    console.log(`Found ${pages.length} pages in content`);
    console.log(`Filtering by topics: ${selectedTopics.join(", ")}`);

    // Filter pages by selected topics
    const matchingPages = pages.filter((page) => {
      if (!page.topic) return false;

      const pageTopic = page.topic.toLowerCase().trim();

      return selectedTopics.some((selectedTopic) => {
        const selected = selectedTopic.toLowerCase().trim();

        if (exactMatch) {
          return pageTopic === selected;
        } else {
          // Check if either topic contains the other (more flexible matching)
          return pageTopic.includes(selected) || selected.includes(pageTopic);
        }
      });
    });

    console.log(`Found ${matchingPages.length} matching pages`);

    if (matchingPages.length === 0) {
      return `<!-- No content found for topics: ${selectedTopics.join(
        ", "
      )} -->`;
    }

    // Reconstruct the filtered content
    const filteredContent = matchingPages
      .map((page) => page.content)
      .join("\n\n");

    return filteredContent;
  } catch (error) {
    console.error("Error filtering content by topics:", error);
    return rawContent; // Return original content if filtering fails
  }
}

/**
 * Extract all available topics from raw content
 * This helper function parses the content and returns all unique topics
 *
 * @param {string} rawContent - The raw content in <PAGE-X> format with metadata
 * @returns {Array<string>} - Array of unique topics found in the content
 */
export function extractTopicsFromContent(rawContent) {
  if (!rawContent) return [];

  try {
    const topics = new Set();
    const pageRegex = /<PAGE-(\d+)>([\s\S]*?)<\/PAGE-\1>/g;
    let match;

    while ((match = pageRegex.exec(rawContent)) !== null) {
      const pageContent = match[2];
      const topicMatch = pageContent.match(/<!-- TOPIC: (.*?) -->/);

      if (topicMatch) {
        const topic = topicMatch[1].trim();
        if (topic && topic.length > 0) {
          topics.add(topic);
        }
      }
    }

    return Array.from(topics).sort();
  } catch (error) {
    console.error("Error extracting topics from content:", error);
    return [];
  }
}

/**
 * Get page count and basic statistics from raw content
 *
 * @param {string} rawContent - The raw content in <PAGE-X> format
 * @returns {Object} - Statistics about the content
 */
export function getContentStatistics(rawContent) {
  if (!rawContent) {
    return { pageCount: 0, topics: [], totalCharacters: 0 };
  }

  try {
    const pageRegex = /<PAGE-(\d+)>([\s\S]*?)<\/PAGE-\1>/g;
    const pages = [];
    const topics = new Set();
    let match;

    while ((match = pageRegex.exec(rawContent)) !== null) {
      const pageNumber = parseInt(match[1]);
      const pageContent = match[2];

      // Extract topic
      const topicMatch = pageContent.match(/<!-- TOPIC: (.*?) -->/);
      if (topicMatch) {
        const topic = topicMatch[1].trim();
        if (topic) topics.add(topic);
      }

      pages.push({
        pageNumber,
        characterCount: pageContent.length,
      });
    }

    const totalCharacters = pages.reduce(
      (sum, page) => sum + page.characterCount,
      0
    );

    return {
      pageCount: pages.length,
      topics: Array.from(topics).sort(),
      totalCharacters,
      averageCharactersPerPage:
        pages.length > 0 ? Math.round(totalCharacters / pages.length) : 0,
    };
  } catch (error) {
    console.error("Error getting content statistics:", error);
    return { pageCount: 0, topics: [], totalCharacters: 0 };
  }
}