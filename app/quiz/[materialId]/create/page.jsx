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
  PenTool,
  Settings,
  CheckCircle,
  MessageSquareDashed,
  Clock4,
  Loader,
  AlertTriangle,
  HelpCircle,
  CheckSquare,
  CircleDot,
  AlertCircle,
  Tag,
  X,
} from "lucide-react";

const QuizCreationPage = () => {
  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedQuizId, setGeneratedQuizId] = useState(null);
  const [error, setError] = useState(null);  const [quizParams, setQuizParams] = useState({
    title: "",
    numQuestions: 5,
    difficulty: "medium",
    questionType: "multiple-choice",
    timeLimit: 10, // minutes
    selectedTopics: [], // Add selected topics field
    translateToArabic: false, // Add translation option
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
          setQuizParams((prev) => ({
            ...prev,
            title: `Quiz on ${data.title || "Study Material"}`,
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

  const handleQuizParamChange = (param, value) => {
    setQuizParams((prev) => ({
      ...prev,
      [param]: value,
    }));
  };

  const handleGenerateQuiz = async () => {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },        body: JSON.stringify({
          materialId,
          numQuestions: quizParams.numQuestions,
          difficulty: quizParams.difficulty,
          questionType: quizParams.questionType,
          timeLimit: quizParams.timeLimit,
          selectedTopics: quizParams.selectedTopics, // Include selected topics
          translateToArabic: quizParams.translateToArabic, // Include translation option
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate quiz");
      }

      if (data.success && data.quiz) {
        setGeneratedQuizId(data.quiz.id);
      } else {
        throw new Error("No quiz data received");
      }
    } catch (error) {
      console.error("Error generating quiz:", error);
      setError(error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleViewQuiz = () => {
    if (generatedQuizId) {
      router.push(`/quiz/${materialId}/view?quizId=${generatedQuizId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <Loader className="h-12 w-12 text-[#2563eb] animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-medium text-[#223366]">
            Loading material details...
          </h2>
        </div>
      </div>
    );
  }

  if (error || !material) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="text-[#2563eb] text-5xl mb-4">!</div>
          <h2 className="text-xl font-medium text-[#223366] mb-2">
            Error Loading Material
          </h2>
          <p className="text-[#223366] mb-6">
            {error || "The requested material could not be found"}
          </p>
          <Button
            onClick={() => router.back()}
            className="bg-gradient-to-r from-[#7eb6ff] to-[#2563eb] text-white font-bold border border-[#7eb6ff] shadow-lg transition-transform duration-200 hover:-translate-y-1 hover:shadow-2xl hover:from-[#2563eb] hover:to-[#7eb6ff] focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2"
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
      <div className="min-h-screen bg-white flex flex-col p-6 md:p-10">
        <div className="max-w-4xl w-full mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-6 text-[#223366] hover:text-[#142042] hover:bg-[#eaf0fa]"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div className="bg-white rounded-xl shadow-md overflow-hidden p-8 text-center border border-[#b3c6e0]">
            <AlertTriangle className="h-16 w-16 text-[#fbbf24] mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[#223366] mb-4">
              Material Not Ready
            </h2>
            <p className="text-[#223366] mb-6 max-w-md mx-auto">
              This material is still being processed. Quiz generation requires
              fully processed materials. Current status: {" "}
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
                className="h-2 mb-2 bg-[#b3c6e0]"
                indicatorClassName="bg-gradient-to-r from-[#7eb6ff] to-[#2563eb]"
              />
              <p className="text-sm text-[#223366]/70">
                Please check back later when processing is complete
              </p>
            </div>
            <Button
              onClick={() => router.push(`/materials/${materialId}`)}
              className="bg-gradient-to-r from-[#7eb6ff] to-[#2563eb] text-white font-bold border border-[#7eb6ff] shadow-lg transition-transform duration-200 hover:-translate-y-1 hover:shadow-2xl hover:from-[#2563eb] hover:to-[#7eb6ff] focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2"
            >
              Return to Material Details
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col p-6 md:p-10">
      <div className="max-w-4xl w-full mx-auto">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => router.push(`/materials/${materialId}`)}
          className="mb-6 text-[#223366] hover:text-[#142042] hover:bg-[#eaf0fa]"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Material
        </Button>

        {/* Page header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-[#223366] mb-4">
            Create Quiz
          </h1>
          <p className="text-[#223366] max-w-2xl mx-auto">
            Generate a customized quiz based on "
            {material?.title || "this material"}" to test your knowledge and
            enhance learning retention.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Material Info - Now at the top */}
            <Card className="bg-[#eaf0fa] shadow-md border border-[#b3c6e0]">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-[#2563eb]" />
                  Material Info
                </CardTitle>
                <CardDescription className="text-[#223366]">Source material details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {material.type?.includes("pdf") ||
                    material.fileName?.endsWith(".pdf") ? (
                      <FileText className="h-12 w-12 text-[#2563eb]" />
                    ) : material.type?.includes("audio") ? (
                      <FileAudio className="h-12 w-12 text-[#2563eb]" />
                    ) : material.type?.includes("video") ? (
                      <FileVideo className="h-12 w-12 text-[#2563eb]" />
                    ) : material.link?.includes("youtube") ? (
                      <Youtube className="h-12 w-12 text-[#2563eb]" />
                    ) : (
                      <File className="h-12 w-12 text-[#223366]" />
                    )}
                  </div>
                  <div className="flex-grow">
                    <h3
                      className="text-lg font-medium text-[#223366] line-clamp-2"
                      title={material.title}
                    >
                      {material.title || "Untitled Material"}
                    </h3>
                    <Badge className="mt-1 bg-[#eaf0fa] text-[#2563eb] border border-[#b3c6e0]">
                      Ready for Quiz
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

            {/* Quiz parameters - Now below Material Info */}
            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2 text-[#2563eb]" />
                  Quiz Parameters
                </CardTitle>
                <CardDescription>Customize your quiz settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Quiz Title */}
                <div className="space-y-2">
                  <Label htmlFor="quiz-title">Quiz Title</Label>
                  <Input
                    id="quiz-title"
                    value={quizParams.title}
                    onChange={(e) =>
                      handleQuizParamChange("title", e.target.value)
                    }
                    placeholder="Enter a title for your quiz"
                    className="w-full"
                  />
                </div>

                {/* Number of Questions */}
                <div className="space-y-2">
                  <Label className="text-sm text-gray-700">
                    Number of Questions
                  </Label>
                  <div className="flex flex-wrap items-center gap-2">
                    {[3, 5, 10, 15, 20].map((value) => (
                      <Button
                        key={value}
                        type="button"
                        variant={
                          quizParams.numQuestions === value
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        className={
                          quizParams.numQuestions === value
                            ? "bg-gradient-to-r from-[#7eb6ff] to-[#2563eb] text-white no-loading"
                            : "border-gray-200 no-loading"
                        }
                        onClick={() =>
                          handleQuizParamChange("numQuestions", value)
                        }
                      >
                        {value}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Difficulty */}
                <div className="space-y-2">
                  <Label className="text-sm text-gray-700">
                    Difficulty Level
                  </Label>
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { value: "easy", label: "Easy" },
                      { value: "medium", label: "Medium" },
                      { value: "hard", label: "Hard" },
                    ].map((diff) => (
                      <Button
                        key={diff.value}
                        type="button"
                        variant={
                          quizParams.difficulty === diff.value
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        className={
                          quizParams.difficulty === diff.value
                            ? "bg-gradient-to-r from-[#7eb6ff] to-[#2563eb] text-white no-loading"
                            : "border-gray-200 no-loading"
                        }
                        onClick={() =>
                          handleQuizParamChange("difficulty", diff.value)
                        }
                      >
                        {diff.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Question Type */}
                <div className="space-y-2">
                  <Label className="text-sm text-gray-700">Question Type</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      {
                        value: "multiple-choice",
                        label: "Multiple Choice",
                        icon: <CircleDot className="h-3 w-3" />,
                      },
                      {
                        value: "true-false",
                        label: "True/False",
                        icon: <CheckSquare className="h-3 w-3" />,
                      },
                      {
                        value: "multi-select",
                        label: "Multi-Select",
                        icon: <MessageSquareDashed className="h-3 w-3" />,
                      },
                      {
                        value: "mixed",
                        label: "Mixed",
                        icon: <Brain className="h-3 w-3" />,
                      },
                    ].map((type) => (
                      <Button
                        key={type.value}
                        type="button"
                        variant={
                          quizParams.questionType === type.value
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        className={
                          quizParams.questionType === type.value
                            ? "bg-gradient-to-r from-[#7eb6ff] to-[#2563eb] text-white no-loading"
                            : "border-gray-200 no-loading"
                        }
                        onClick={() =>
                          handleQuizParamChange("questionType", type.value)
                        }
                      >
                        <span className="mr-1">{type.icon}</span>
                        {type.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Time Limit */}
                <div className="space-y-2">
                  <Label className="text-sm text-gray-700">
                    Time Limit (minutes)
                  </Label>
                  <div className="flex flex-wrap items-center gap-2">
                    {[5, 10, 15, 20, 30, "No Limit"].map((value) => (
                      <Button
                        key={value}
                        type="button"
                        variant={
                          quizParams.timeLimit === value ? "default" : "outline"
                        }
                        size="sm"
                        className={
                          quizParams.timeLimit === value
                            ? "bg-gradient-to-r from-[#7eb6ff] to-[#2563eb] text-white no-loading"
                            : "border-gray-200 no-loading"
                        }
                        onClick={() =>
                          handleQuizParamChange("timeLimit", value)
                        }
                      >
                        {value === "No Limit" ? value : `${value} min`}
                      </Button>
                    ))}
                  </div>                </div>

                {/* Topic Selection */}
                {material?.topics && material.topics.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-700 flex items-center">
                      <Tag className="h-4 w-4 mr-2 text-[#2563eb]" />
                      Filter by Topics (Optional)
                    </Label>
                    <p className="text-xs text-[#223366] mb-3">
                      Select specific topics to focus on. Leave empty to include
                      all topics.
                    </p>
                    <div className="space-y-2">
                      {/* Selected Topics Display */}
                      {quizParams.selectedTopics.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-3 bg-[#eaf0fa] border border-[#b3c6e0] rounded-lg">
                          {quizParams.selectedTopics.map(
                            (topic, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#eaf0fa] text-[#2563eb] border border-[#b3c6e0]"
                              >
                                {topic}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newSelectedTopics =
                                      quizParams.selectedTopics.filter(
                                        (t) => t !== topic
                                      );
                                    handleQuizParamChange(
                                      "selectedTopics",
                                      newSelectedTopics
                                    );
                                  }}
                                  className="ml-1 text-[#2563eb] hover:text-[#142042]"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            )
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              handleQuizParamChange("selectedTopics", [])
                            }
                            className="text-xs text-[#2563eb] hover:text-[#142042] underline"
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
                              checked={quizParams.selectedTopics.includes(
                                topic
                              )}
                              onChange={(e) => {
                                const newSelectedTopics = e.target.checked
                                  ? [...quizParams.selectedTopics, topic]
                                  : quizParams.selectedTopics.filter(
                                      (t) => t !== topic
                                    );
                                handleQuizParamChange(
                                  "selectedTopics",
                                  newSelectedTopics
                                );
                              }}
                              className="h-4 w-4 text-[#2563eb] border-gray-300 rounded focus:ring-[#2563eb]"
                            />
                            <span className="text-sm text-[#223366] flex-1">
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
                          handleQuizParamChange("selectedTopics", [
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
                          handleQuizParamChange("selectedTopics", [])
                        }
                      >
                        Clear Selection
                      </Button>
                    </div>                  </div>
                )}

                {/* Arabic Translation Option */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="translate-to-arabic-quiz"
                      checked={quizParams.translateToArabic}
                      onChange={(e) =>
                        handleQuizParamChange(
                          "translateToArabic",
                          e.target.checked
                        )
                      }
                      className="h-4 w-4 text-[#2563eb] border-gray-300 rounded focus:ring-[#2563eb]"
                    />
                    <Label
                      htmlFor="translate-to-arabic-quiz"
                      className="text-sm font-medium text-[#223366] cursor-pointer flex items-center"
                    >
                      <span className="ml-1">
                        🌐 Translate quiz content to Arabic
                      </span>
                    </Label>
                  </div>
                  <p className="text-xs text-[#223366] ml-6">
                    Generate quiz questions in Arabic to help non-English speakers
                    understand the material better. Original English text will
                    be preserved for reference.
                  </p>
                  {quizParams.translateToArabic && (
                    <div className="ml-6 mt-2 p-3 bg-[#e0f7fa] border border-[#b2ebf2] rounded-lg">
                      <div className="flex items-start space-x-2">
                        <div className="text-[#00796b] text-lg">🇸🇦</div>
                        <div>
                          <p className="text-sm font-medium text-[#00796b]">
                            Arabic Translation Enabled
                          </p>
                          <p className="text-xs text-[#004d40] mt-1">
                            Quiz questions will be translated to Arabic using Fanar's
                            AI translation service. This will add some extra processing time.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
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
                {generatedQuizId ? (
                  <Button
                    className="bg-gradient-to-r from-[#7eb6ff] to-[#2563eb] text-white font-bold border border-[#7eb6ff] shadow-lg transition-transform duration-200 hover:-translate-y-1 hover:shadow-2xl hover:from-[#2563eb] hover:to-[#7eb6ff] focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2"
                    onClick={handleViewQuiz}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    View Generated Quiz
                  </Button>
                ) : (
                  <Button
                    className="bg-gradient-to-r from-[#7eb6ff] to-[#2563eb] text-white font-bold border border-[#7eb6ff] shadow-lg transition-transform duration-200 hover:-translate-y-1 hover:shadow-2xl hover:from-[#2563eb] hover:to-[#7eb6ff] focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2"
                    onClick={handleGenerateQuiz}
                    disabled={generating}
                  >
                    {generating ? (
                      <>
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                        Generating Quiz...
                      </>
                    ) : (
                      <>
                        <Brain className="mr-2 h-4 w-4" />
                        Generate Quiz
                      </>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* About Quizzes information card */}
            <Card className="bg-[#eaf0fa] shadow-sm border border-[#b3c6e0]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center">
                  <Brain className="h-4 w-4 mr-2 text-[#2563eb]" />
                  About Quizzes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#223366]">
                  This quiz will be generated based on the content of the
                  material. The AI will analyze the text and create relevant
                  questions to test your knowledge.
                </p>
              </CardContent>
            </Card>

            {/* Generation info card - Now on the right */}
            {generating && (
              <Card className="bg-[#eaf0fa] border-[#b3c6e0] shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <Loader className="h-12 w-12 text-[#2563eb] animate-spin mb-4" />
                    <h3 className="text-lg font-medium text-[#223366] mb-2">
                      Generating Your Quiz
                    </h3>
                    <p className="text-sm text-[#2563eb]">
                      Our AI is analyzing the material and creating meaningful
                      questions. This may take a minute or two.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tips card - Now on the right */}
            <Card className="bg-gradient-to-br from-[#eaf0fa] to-[#b3c6e0] border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start">
                  <HelpCircle className="h-5 w-5 text-[#2563eb] mr-2 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-[#223366] mb-1">
                      Tips for Better Quizzes
                    </h4>
                    <ul className="text-xs text-[#223366] space-y-1 list-disc pl-4">
                      <li>Choose fewer questions for quick reviews</li>
                      <li>Mix question types for comprehensive learning</li>
                      <li>Start with medium difficulty and adjust as needed</li>
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

export default QuizCreationPage;
