"use client";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
  Sparkles,
  Book,
  CheckCircle,
  Loader,
  AlertTriangle,
  HelpCircle,
  AlertCircle,
  BookOpen,
  X,
  Tag,
} from "lucide-react";

const SummaryCreationPage = () => {
  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedSummaryId, setGeneratedSummaryId] = useState(null);
  const [error, setError] = useState(null);  const [summaryParams, setSummaryParams] = useState({
    title: "",
    language: "English",
    level: "College",
    includeExample: false,
    selectedTopics: [], // New field for selected topics
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
        if (data.success) {          const materialData = {
            id: data.material_id,
            title: data.title,
            fileName: data.fileName,
            type: data.type,
            link: data.link,
            status: data.material_status,
            rawContent: data.rawContent,
            topics: data.topics || [], // Include topics array
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };

          setMaterial(materialData);
          setSummaryParams((prev) => ({
            ...prev,
            title: `Summary of ${data.title || "Study Material"}`,
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

  const handleSummaryParamChange = (param, value) => {
    setSummaryParams((prev) => ({
      ...prev,
      [param]: value,
    }));
  };

  const handleGenerateSummary = async () => {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/summary/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },        body: JSON.stringify({
          materialId,
          title: summaryParams.title,
          language: summaryParams.language,
          level: summaryParams.level,
          includeExample: summaryParams.includeExample,
          selectedTopics: summaryParams.selectedTopics, // Include selected topics
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate summary");
      }

      if (data.success && data.summary) {
        setGeneratedSummaryId(data.summary.id);
      } else {
        throw new Error("No summary data received");
      }
    } catch (error) {
      console.error("Error generating summary:", error);
      setError(error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleViewSummary = () => {
    if (generatedSummaryId) {
      router.push(
        `/summary/${materialId}/view?summaryId=${generatedSummaryId}`
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <Loader className="h-12 w-12 text-rose-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-800">
            Loading material details...
          </h2>
        </div>
      </div>
    );
  }

  if (error && !material) {
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
            className="bg-gradient-to-r from-rose-600 to-pink-600 text-white"
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
              This material is still being processed. Summary generation
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
              className="bg-gradient-to-r from-rose-600 to-pink-600 text-white"
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
          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-600 to-pink-600 mb-4">
            Create Summary
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Generate a comprehensive summary based on "
            {material?.title || "this material"}" to help understand key
            concepts and information.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Material Info - Now at the top */}
            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-rose-600" />
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
                      Ready for Summary
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

            {/* Summary parameters - Now below Material Info */}
            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Sparkles className="h-5 w-5 mr-2 text-rose-600" />
                  Summary Settings
                </CardTitle>
                <CardDescription>Customize your summary</CardDescription>
              </CardHeader>              <CardContent className="space-y-6">
                {/* Summary Title */}
                <div className="space-y-2">
                  <Label htmlFor="summary-title">Summary Title</Label>
                  <Input
                    id="summary-title"
                    value={summaryParams.title}
                    onChange={(e) =>
                      handleSummaryParamChange("title", e.target.value)
                    }
                    placeholder="Enter a title for your summary"
                    className="w-full"
                  />
                </div>

                {/* Language Selection */}
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={summaryParams.language}
                    onValueChange={(value) =>
                      handleSummaryParamChange("language", value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Arabic">العربية (Arabic)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Level Selection */}
                <div className="space-y-2">
                  <Label htmlFor="level">Academic Level</Label>
                  <Select
                    value={summaryParams.level}
                    onValueChange={(value) =>
                      handleSummaryParamChange("level", value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select academic level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Elementary">Elementary</SelectItem>
                      <SelectItem value="Middle School">Middle School</SelectItem>
                      <SelectItem value="High School">High School</SelectItem>
                      <SelectItem value="College">College</SelectItem>
                      <SelectItem value="Graduate">Graduate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>                {/* Cultural Example Option */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-example"
                    checked={summaryParams.includeExample}
                    onCheckedChange={(checked) =>
                      handleSummaryParamChange("includeExample", checked)
                    }
                  />
                  <Label htmlFor="include-example" className="text-sm">
                    Include culturally-relevant examples (Qatari/GCC context)
                  </Label>
                </div>

                {/* Topic Selection */}
                {material?.topics && material.topics.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-700 flex items-center">
                      <Tag className="h-4 w-4 mr-2 text-rose-600" />
                      Filter by Topics (Optional)
                    </Label>
                    <p className="text-xs text-gray-500 mb-3">
                      Select specific topics to focus on. Leave empty to include
                      all content.
                    </p>
                    <div className="space-y-2">
                      {/* Selected Topics Display */}
                      {summaryParams.selectedTopics.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                          {summaryParams.selectedTopics.map(
                            (topic, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800"
                              >
                                {topic}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newSelectedTopics =
                                      summaryParams.selectedTopics.filter(
                                        (t) => t !== topic
                                      );
                                    handleSummaryParamChange(
                                      "selectedTopics",
                                      newSelectedTopics
                                    );
                                  }}
                                  className="ml-1 text-rose-600 hover:text-rose-800"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            )
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              handleSummaryParamChange("selectedTopics", [])
                            }
                            className="text-xs text-rose-600 hover:text-rose-800 underline"
                          >
                            Clear all
                          </button>
                        </div>
                      )}

                      {/* Available Topics */}
                      <div className="grid grid-cols-1 gap-2">
                        {material.topics.map((topic, index) => (
                          <label
                            key={index}
                            className="flex items-center space-x-2 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={summaryParams.selectedTopics.includes(
                                topic
                              )}
                              onChange={(e) => {
                                const newSelectedTopics = e.target.checked
                                  ? [...summaryParams.selectedTopics, topic]
                                  : summaryParams.selectedTopics.filter(
                                      (t) => t !== topic
                                    );
                                handleSummaryParamChange(
                                  "selectedTopics",
                                  newSelectedTopics
                                );
                              }}
                              className="h-4 w-4 text-rose-600 border-gray-300 rounded focus:ring-rose-500"
                            />
                            <span className="text-sm text-gray-700 flex-1">
                              {topic}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Quick Select All/None */}
                    <div className="flex gap-2 mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() =>
                          handleSummaryParamChange("selectedTopics", [
                            ...material.topics,
                          ])
                        }
                      >
                        Select All Topics
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() =>
                          handleSummaryParamChange("selectedTopics", [])
                        }
                      >
                        Clear Selection
                      </Button>
                    </div>
                  </div>
                )}

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
                {generatedSummaryId ? (
                  <Button
                    className="bg-gradient-to-r from-green-600 to-emerald-600 text-white"
                    onClick={handleViewSummary}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    View Generated Summary
                  </Button>
                ) : (
                  <Button
                    className="bg-gradient-to-r from-rose-600 to-pink-600 text-white no-loading"
                    onClick={handleGenerateSummary}
                    disabled={generating}
                  >
                    {generating ? (
                      <>
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                        Generating Summary...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Summary
                      </>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* About Summaries information card */}
            <Card className="bg-white shadow-sm border border-rose-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center">
                  <BookOpen className="h-4 w-4 mr-2 text-rose-600" />
                  About Summaries
                </CardTitle>
              </CardHeader>              <CardContent>
                <p className="text-sm text-gray-600">
                  AI-generated summaries analyze your material to identify key
                  topics, concepts, and examples. Customize the language, academic level,
                  and optionally include culturally-relevant examples. The result is a 
                  structured, easy-to-read study guide that helps you understand and retain
                  information effectively.
                </p>
              </CardContent>
            </Card>

            {/* Generation info card - Now on the right */}
            {generating && (
              <Card className="bg-rose-50 border-rose-100 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <Loader className="h-12 w-12 text-rose-600 animate-spin mb-4" />
                    <h3 className="text-lg font-medium text-rose-800 mb-2">
                      Generating Your Summary
                    </h3>
                    <p className="text-sm text-rose-600">
                      Our AI is analyzing the material and creating a
                      comprehensive summary. This may take a minute or two.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tips card - Now on the right */}
            <Card className="bg-gradient-to-br from-rose-50 to-pink-50 border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start">
                  <HelpCircle className="h-5 w-5 text-rose-600 mr-2 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-gray-800 mb-1">
                      Tips for Better Understanding
                    </h4>                    <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4">
                      <li>Choose your preferred language and academic level</li>
                      <li>Enable cultural examples for local context</li>
                      <li>Read the summary to get a high-level overview</li>
                      <li>Use the summary as a study guide</li>
                      <li>
                        Reference the original material for deeper understanding
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryCreationPage;
