"use client";

// This page allows users to create flashcards based on a specific study material.
// It fetches the material details, allows customization of flashcard parameters,
// and handles the generation of flashcards using an API endpoint.


import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import {
  File,
  FileText,
  FileAudio,
  FileVideo,
  Youtube,
  Link as LinkIcon,
  Clock,
  Calendar,
  ArrowLeft,
  Brain,
  Sparkles,
  Book,
  Settings,
  CheckCircle,
  Loader,
  AlertTriangle,
  HelpCircle,
  AlertCircle,
  Clipboard,
} from "lucide-react";

const FlashcardCreationPage = () => {  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedDeckId, setGeneratedDeckId] = useState(null);
  const [error, setError] = useState(null);
  const [generationStage, setGenerationStage] = useState("");
  const [generationProgress, setGenerationProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [flashcardParams, setFlashcardParams] = useState({
    title: "",
    description: "",
    numFlashcards: 10,
    generateImages: false, // New option for image generation
  });

  const params = useParams();
  const router = useRouter();
  const materialId = params.materialId;

  useEffect(() => {
    const fetchMaterialDetails = async () => {
      if (!materialId) return;

      try {
        const response = await fetch(`/api/materials/${materialId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch material: ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
          const materialData = {
            id: data.material_id,
            title: data.title,
            fileName: data.fileName,
            type: data.type,
            link: data.link,
            status: data.material_status,
            rawContent: data.rawContent,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };

          setMaterial(materialData);
          setFlashcardParams((prev) => ({
            ...prev,
            title: `Flashcards for ${data.title || "Study Material"}`,
            description: `Key concepts and definitions from ${
              data.title || "study material"
            }`,
          }));
        } else {
          throw new Error(data.error || "Unknown error fetching material");
        }
      } catch (error) {
        console.error("Error fetching material:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMaterialDetails();
  }, [materialId]);

  const handleFlashcardParamChange = (param, value) => {
    setFlashcardParams((prev) => ({
      ...prev,
      [param]: value,
    }));
  };
  const handleGenerateFlashcards = async () => {
    setGenerating(true);
    setError(null);
    setGenerationStage("Initializing...");
    setGenerationProgress(0);
    setStartTime(Date.now());
    
    // Estimate time based on parameters
    const baseTime = flashcardParams.numFlashcards * 3; // 3 seconds per flashcard
    const imageTime = flashcardParams.generateImages ? flashcardParams.numFlashcards * 15 : 0; // 15 seconds per image
    setEstimatedTime(baseTime + imageTime);

    // Set up progress updates
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev < 90) {
          return prev + Math.random() * 5; // Gradual progress increase
        }
        return prev;
      });
    }, 2000);

    // Set up stage updates
    const stageTimeout1 = setTimeout(() => setGenerationStage("Analyzing content..."), 3000);
    const stageTimeout2 = setTimeout(() => setGenerationStage("Generating flashcards..."), 8000);
    const stageTimeout3 = setTimeout(() => {
      if (flashcardParams.generateImages) {
        setGenerationStage("Creating images (this may take a while)...");
      }
    }, 15000);
    const stageTimeout4 = setTimeout(() => setGenerationStage("Finalizing..."), Math.max(20000, (baseTime + imageTime) * 800));

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout

      const response = await fetch("/api/flashcards/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          materialId,
          numFlashcards: flashcardParams.numFlashcards,
          title: flashcardParams.title,
          description: flashcardParams.description,
          generateImages: flashcardParams.generateImages,
        }),
      });      clearTimeout(timeoutId);
      clearInterval(progressInterval);
      clearTimeout(stageTimeout1);
      clearTimeout(stageTimeout2);
      clearTimeout(stageTimeout3);
      clearTimeout(stageTimeout4);

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text();
        console.error("Non-JSON response received:", textResponse);
        throw new Error(`Server returned HTML error page (Status: ${response.status}). This usually indicates a server crash or configuration issue.`);
      }

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 504 || response.status === 524) {
          throw new Error("Generation is taking longer than expected. This often happens with image generation. Please try again or disable image generation for faster results.");
        }
        throw new Error(data.error || "Failed to generate flashcards");
      }

      if (data.success && data.deck) {
        setGenerationProgress(100);
        setGenerationStage("Complete!");
        setGeneratedDeckId(data.deck.id);
      } else {
        throw new Error("No flashcard data received");
      }
    } catch (error) {
      clearInterval(progressInterval);
      clearTimeout(stageTimeout1);
      clearTimeout(stageTimeout2);
      clearTimeout(stageTimeout3);
      clearTimeout(stageTimeout4);
      
      console.error("Error generating flashcards:", error);
      
      if (error.name === 'AbortError') {
        setError("Request timeout. Generation may still be in progress on the server. Please wait a moment and check your flashcard list, or try again with fewer flashcards or without images.");
      } else {
        setError(error.message);
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleViewFlashcards = () => {
    if (generatedDeckId) {
      router.push(`/flashcards/${materialId}/view?deckId=${generatedDeckId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <Loader className="h-12 w-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-800">
            Loading material details...
          </h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h2 className="text-xl font-medium text-gray-800 mb-2">
            Error Loading Material
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button
            onClick={() => router.back()}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (material.status !== "Ready" && material.status !== "ready") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col p-6 md:p-10">
        <div className="max-w-4xl w-full mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-6 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div className="bg-white rounded-xl shadow-md overflow-hidden p-8 text-center">
            <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Material Not Ready
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              This material is still being processed. Flashcard generation
              requires fully processed materials. Current status:{" "}
              <span className="font-medium">{material.status}</span>
            </p>
            <div className="max-w-md mx-auto mb-8">
              <Progress
                value={
                  material.status === "Processing"
                    ? 75
                    : material.status === "Converting to text"
                    ? 80
                    : material.status === "Skimming Through"
                    ? 85
                    : material.status === "Summarizing"
                    ? 95
                    : 50
                }
                className="h-2 mb-2"
              />
              <p className="text-sm text-gray-500">
                Please check back later when processing is complete
              </p>
            </div>
            <Button
              onClick={() => router.push(`/materials/${materialId}`)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
            >
              Return to Material Details
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col p-6 md:p-10">
      <div className="max-w-4xl w-full mx-auto">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => router.push(`/materials/${materialId}`)}
          className="mb-6 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Material
        </Button>

        {/* Page header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-orange-600 mb-4">
            Create Flashcards
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Generate a set of flashcards based on "
            {material?.title || "this material"}" to help memorize key concepts
            and information.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Material Info - Now at the top */}
            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-amber-600" />
                  Material Info
                </CardTitle>
                <CardDescription>Source material details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {material.type?.includes("pdf") ||
                    material.fileName?.endsWith(".pdf") ? (
                      <FileText className="h-12 w-12 text-blue-600" />
                    ) : material.type?.includes("audio") ? (
                      <FileAudio className="h-12 w-12 text-emerald-600" />
                    ) : material.type?.includes("video") ? (
                      <FileVideo className="h-12 w-12 text-purple-600" />
                    ) : material.link?.includes("youtube") ? (
                      <Youtube className="h-12 w-12 text-red-600" />
                    ) : (
                      <File className="h-12 w-12 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-grow">
                    <h3
                      className="text-lg font-medium text-gray-800 line-clamp-2"
                      title={material.title}
                    >
                      {material.title || "Untitled Material"}
                    </h3>
                    <Badge className="mt-1 bg-green-100 text-green-800">
                      Ready for Flashcards
                    </Badge>

                    <div className="mt-2 space-y-1 text-sm">
                      {material.fileName && (
                        <div className="flex items-center">
                          <File className="h-3 w-3 text-gray-400 mr-1.5" />
                          <span className="text-gray-600 text-xs truncate max-w-xs">
                            {material.fileName}
                          </span>
                        </div>
                      )}
                      {material.type && (
                        <div className="flex items-center">
                          <FileText className="h-3 w-3 text-gray-400 mr-1.5" />
                          <span className="text-gray-600 text-xs">
                            Type: {material.type}
                          </span>
                        </div>
                      )}
                      {material.createdAt && (
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 text-gray-400 mr-1.5" />
                          <span className="text-gray-600 text-xs">
                            Added:{" "}
                            {new Date(material.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Flashcard parameters - Now below Material Info */}
            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2 text-amber-600" />
                  Flashcard Settings
                </CardTitle>
                <CardDescription>Customize your flashcards</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Flashcard Title */}
                <div className="space-y-2">
                  <Label htmlFor="flashcard-title">Deck Title</Label>
                  <Input
                    id="flashcard-title"
                    value={flashcardParams.title}
                    onChange={(e) =>
                      handleFlashcardParamChange("title", e.target.value)
                    }
                    placeholder="Enter a title for your flashcard deck"
                    className="w-full"
                  />
                </div>

                {/* Flashcard Description */}
                <div className="space-y-2">
                  <Label htmlFor="flashcard-description">
                    Deck Description
                  </Label>
                  <Textarea
                    id="flashcard-description"
                    value={flashcardParams.description}
                    onChange={(e) =>
                      handleFlashcardParamChange("description", e.target.value)
                    }
                    placeholder="Enter a description for your flashcard deck"
                    className="w-full"
                    rows={3}
                  />
                </div>

                {/* Number of Flashcards */}
                <div className="space-y-2">
                  <Label className="text-sm text-gray-700">
                    Number of Flashcards
                  </Label>
                  <div className="flex flex-wrap items-center gap-2">
                    {[5, 10, 15, 20, 30].map((value) => (
                      <Button
                        key={value}
                        type="button"
                        variant={
                          flashcardParams.numFlashcards === value
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        className={
                          flashcardParams.numFlashcards === value
                            ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white no-loading"
                            : "border-gray-200 no-loading"
                        }
                        onClick={() =>
                          handleFlashcardParamChange("numFlashcards", value)
                        }
                      >
                        {value}
                      </Button>
                    ))}                  </div>
                </div>

                {/* Image Generation Option */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="generate-images"
                      checked={flashcardParams.generateImages}
                      onChange={(e) =>
                        handleFlashcardParamChange("generateImages", e.target.checked)
                      }
                      className="h-4 w-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                    />
                    <Label 
                      htmlFor="generate-images" 
                      className="text-sm font-medium text-gray-700 cursor-pointer"
                    >
                      Generate images for flashcards
                    </Label>
                  </div>
                  <p className="text-xs text-gray-500 ml-6">
                    AI will create visual aids that help illustrate the flashcard answers. 
                    This may take longer to complete.
                  </p>
                </div>

                {/* Error message */}
                {error && (
                  <div className="rounded-md bg-red-50 p-4 border border-red-100">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-red-500 mt-1 mr-2" />
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end border-t pt-6">
                {generatedDeckId ? (
                  <Button
                    className="bg-gradient-to-r from-green-600 to-emerald-600 text-white"
                    onClick={handleViewFlashcards}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    View Generated Flashcards
                  </Button>
                ) : (
                  <Button
                    className="bg-gradient-to-r from-amber-600 to-orange-600 text-white no-loading"
                    onClick={handleGenerateFlashcards}
                    disabled={generating}
                  >
                    {generating ? (
                      <>
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                        Generating Flashcards...
                      </>
                    ) : (
                      <>
                        <Clipboard className="mr-2 h-4 w-4" />
                        Generate Flashcards
                      </>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* About Flashcards information card */}
            <Card className="bg-white shadow-sm border border-amber-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center">
                  <Clipboard className="h-4 w-4 mr-2 text-amber-600" />
                  About Flashcards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Flashcards will be generated based on the content of the
                  material. The AI will identify key terms, concepts, and
                  definitions to help you memorize important information.
                </p>
              </CardContent>
            </Card>            {/* Generation info card - Enhanced progress display */}
            {generating && (
              <Card className="bg-amber-50 border-amber-100 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <Loader className="h-12 w-12 text-amber-600 animate-spin mb-4" />
                    <h3 className="text-lg font-medium text-amber-800 mb-2">
                      {generationStage || "Generating Your Flashcards"}
                    </h3>
                    
                    {/* Progress bar */}
                    <div className="w-full mb-3">
                      <div className="flex justify-between text-xs text-amber-600 mb-1">
                        <span>Progress</span>
                        <span>{Math.round(generationProgress)}%</span>
                      </div>
                      <Progress 
                        value={generationProgress} 
                        className="w-full h-2"
                      />
                    </div>
                    
                    {/* Time estimates */}
                    {estimatedTime && startTime && (
                      <div className="text-xs text-amber-600 mb-2">
                        <div>Estimated time: ~{Math.round(estimatedTime / 60)} minutes</div>
                        <div>Elapsed: {Math.round((Date.now() - startTime) / 1000)}s</div>
                      </div>
                    )}
                    
                    <p className="text-sm text-amber-600">
                      {flashcardParams.generateImages 
                        ? "Generating flashcards with images. This process may take several minutes as each image is carefully created."
                        : "Our AI is analyzing the material and creating effective flashcards. This usually takes 1-2 minutes."
                      }
                    </p>
                    
                    {flashcardParams.generateImages && (
                      <div className="mt-3 p-2 bg-amber-100 rounded-lg">
                        <p className="text-xs text-amber-700">
                          💡 Tip: Image generation can be slow. If this takes too long, you can cancel and try again without images for faster results.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error display - Enhanced with suggestions */}
            {error && !generating && (
              <Card className="bg-red-50 border-red-100 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <AlertCircle className="h-12 w-12 text-red-600 mb-4" />
                    <h3 className="text-lg font-medium text-red-800 mb-2">
                      Generation Error
                    </h3>
                    <p className="text-sm text-red-600 mb-4">
                      {error}
                    </p>
                    
                    {/* Helpful suggestions based on error type */}
                    <div className="bg-red-100 rounded-lg p-3 w-full">
                      <h4 className="text-sm font-medium text-red-800 mb-2">Suggestions:</h4>
                      <ul className="text-xs text-red-700 space-y-1 list-disc text-left pl-4">
                        {error.includes("timeout") || error.includes("longer than expected") ? (
                          <>
                            <li>Try generating fewer flashcards (5-8 instead of {flashcardParams.numFlashcards})</li>
                            <li>Disable image generation for faster results</li>
                            <li>Check your flashcard list - generation may have completed</li>
                            <li>Wait a few minutes before trying again</li>
                          </>
                        ) : (
                          <>
                            <li>Check your internet connection</li>
                            <li>Try with fewer flashcards</li>
                            <li>Ensure the material has enough content</li>
                            <li>Try again in a few moments</li>
                          </>
                        )}
                      </ul>
                    </div>
                    
                    <Button
                      onClick={() => setError(null)}
                      variant="outline"
                      className="mt-4 border-red-200 text-red-700 hover:bg-red-50"
                    >
                      Try Again
                    </Button>
                  </div>
                </CardContent>
              </Card>            )}
            
            {/* Tips card - Enhanced with timing info */}
            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start">
                  <HelpCircle className="h-5 w-5 text-amber-600 mr-2 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-gray-800 mb-1">
                      Tips for Better Flashcards
                    </h4>
                    <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4">
                      <li>Choose fewer cards for core concepts only</li>
                      <li>Use more cards for comprehensive coverage</li>
                      <li>Text-only generation: ~1-2 minutes</li>
                      <li>With images: ~5-15 minutes (be patient!)</li>
                      <li>Review your flashcards regularly for best results</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance warning for image generation */}
            {flashcardParams.generateImages && (
              <Card className="bg-yellow-50 border-yellow-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800 mb-1">
                        Image Generation Enabled
                      </h4>
                      <p className="text-xs text-yellow-700">
                        Image generation significantly increases processing time (up to 15 minutes). 
                        Each image is carefully created to be relevant and text-free. 
                        Consider starting with fewer flashcards for your first try.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlashcardCreationPage;
