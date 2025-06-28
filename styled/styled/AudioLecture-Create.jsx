//AUDIO LECTURE - CREATE PAGE
// This page allows users to create an audio lecture based on a study material.

"use client";
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  FileAudio,
  Loader,
  PlayCircle,
  Clock,
  Sparkles,
  AlertCircle,
  Radio,
} from "lucide-react";

const AudioLectureCreatePage = () => {
  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [audioLectureId, setAudioLectureId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusPolling, setStatusPolling] = useState(null);
  // Form state
  const [title, setTitle] = useState("");
  const [voice, setVoice] = useState("default");
  const [style, setStyle] = useState("default");
  const [duration, setDuration] = useState("default");
  const [customDuration, setCustomDuration] = useState(300);
  const [language, setLanguage] = useState("en");
  const [translateToArabic, setTranslateToArabic] = useState(false);

  const params = useParams();
  const router = useRouter();
  const materialId = params.materialId;

  // Available voice options for Fanar TTS
  const voiceOptions = [
    { value: "default", label: "Default Voice" },
    // Additional Fanar voices can be added here as they become available
  ];

  // Style options
  const styleOptions = [
    { value: "default", label: "Default" },
    { value: "conversational", label: "Conversational" },
    { value: "formal", label: "Formal and Academic" },
    { value: "enthusiastic", label: "Enthusiastic" },
    { value: "gentle", label: "Gentle and Calm" },
  ];

  // Duration presets
  const durationOptions = [
    { value: "default", label: "Default (5-10 minutes)" },
    { value: "short", label: "Short (2-3 minutes)" },
    { value: "medium", label: "Medium (5-7 minutes)" },
    { value: "long", label: "Long (10-15 minutes)" },
    { value: "custom", label: "Custom Duration" },
  ];

  useEffect(() => {
    const fetchMaterial = async () => {
      try {
        const response = await fetch(`/api/materials/${materialId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch material: ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
          setMaterial({
            id: data.material_id,
            title: data.title,
            status: data.material_status,
          });

          // Set default title
          setTitle(`Audio Lecture: ${data.title || "Study Material"}`);
        } else {
          throw new Error(data.error || "Failed to fetch material");
        }
      } catch (error) {
        console.error("Error fetching material:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMaterial();

    // Clean up polling interval on unmount
    return () => {
      if (statusPolling) {
        clearInterval(statusPolling);
      }
    };
  }, [materialId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setProgress(10);
    setStatusMessage("Starting generation process...");

    try {
      // Determine actual duration value to send
      let durationValue = 0; // Default: no specific target

      switch (duration) {
        case "short":
          durationValue = 180; // 3 minutes
          break;
        case "medium":
          durationValue = 360; // 6 minutes
          break;
        case "long":
          durationValue = 780; // 13 minutes
          break;
        case "custom":
          durationValue = parseInt(customDuration, 10);
          break;
        // Default case will leave it at 0
      }      const response = await fetch("/api/audio-lecture/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          materialId,
          title,
          voice,
          style,
          duration: durationValue,
          language,
          translateToArabic,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate audio lecture");
      }

      const data = await response.json();

      if (data.success) {
        setAudioLectureId(data.audioLecture.id);
        setProgress(20);
        setStatusMessage("Starting lecture script generation...");

        // Begin polling for status
        startStatusPolling(data.audioLecture.id);
      } else {
        throw new Error(data.error || "Failed to start generation process");
      }
    } catch (error) {
      console.error("Error generating audio lecture:", error);
      setError(error.message);
      setGenerating(false);
    }
  };

  const startStatusPolling = (id) => {
    // Set initial polling
    const poll = setInterval(async () => {
      try {
        const response = await fetch(`/api/audio-lecture/${id}/status`);
        if (!response.ok) {
          throw new Error("Failed to check status");
        }

        const data = await response.json();
        if (data.success) {
          const { status } = data.audioLecture;

          // Update progress based on status
          switch (status) {
            case "processing":
              setProgress(30);
              setStatusMessage("Generating lecture script...");
              break;
            case "generating-audio":
              setProgress(60);
              setStatusMessage("Converting script to speech...");
              break;
            case "ready":
              setProgress(100);
              setStatusMessage("Audio lecture ready!");
              setSuccess(true);
              setGenerating(false);
              clearInterval(poll);
              break;
            case "error":
              throw new Error("Error occurred during generation");
            default:
              setStatusMessage(`Status: ${status}`);
          }

          // If completed, clear the interval
          if (status === "ready" || status === "error") {
            clearInterval(poll);
            if (status === "ready") {
              // Wait 2 seconds then redirect to view page
              setTimeout(() => {
                router.push(
                  `/audio-lecture/${materialId}/view?lectureId=${id}`
                );
              }, 2000);
            }
          }
        }
      } catch (error) {
        console.error("Error polling status:", error);
        setError("Error checking generation status. Please try again.");
        setGenerating(false);
        clearInterval(poll);
      }
    }, 3000); // Poll every 3 seconds

    setStatusPolling(poll);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDurationChange = (e) => {
    const value = e.target.value;
    setDuration(value);
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

  if (error && !material) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h2 className="text-xl font-medium text-[#223366] mb-2">
            Error Loading Material
          </h2>
          <p className="text-[#223366] mb-6">{error}</p>
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

  if (generating) {
    return (
      <div className="min-h-screen bg-white flex flex-col p-6 md:p-10">
        <div className="max-w-lg mx-auto w-full">
          <Card className="shadow-md bg-white">
            <CardHeader>
              <CardTitle className="text-center flex items-center justify-center">
                <FileAudio className="h-6 w-6 mr-2 text-[#2563eb]" />
                Generating Audio Lecture
              </CardTitle>
              <CardDescription className="text-center">
                This might take a few minutes. Please wait...
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{statusMessage}</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2 bg-[#b3c6e0]" />
              </div>

              <div className="flex justify-center">
                <div className="animate-pulse text-[#2563eb]">
                  <Loader className="h-16 w-16 animate-spin" />
                </div>
              </div>

              <div className="bg-[#eaf0fa] p-4 rounded-md border border-[#b3c6e0] text-sm text-[#223366]">
                <p>
                  <strong>Note:</strong> Audio generation can take several
                  minutes depending on the length of your material. Please don't
                  close this tab.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full border-[#b3c6e0] text-[#223366]" disabled={true}>
                <Clock className="h-4 w-4 mr-2" />
                Generation in progress...
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col p-6 md:p-10">
      <div className="max-w-4xl mx-auto w-full">
        <div className="bg-[#eaf0fa] rounded-2xl p-6 md:p-10 border border-[#b3c6e0] shadow-xl">
          {/* Back button */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="text-[#223366] hover:text-[#142042] hover:bg-[#eaf0fa]"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
          

          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#223366] mb-2">
              Create Audio Lecture
            </h1>
            <p className="text-[#223366]">
              Generate an AI-narrated lecture based on your material
            </p>
          </div>

          {/* Creation Form */}
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-8">
              <Card className="shadow-md border border-[#b3c6e0]">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileAudio className="h-5 w-5 mr-2 text-[#2563eb]" />
                    Audio Lecture Details
                  </CardTitle>
                  <CardDescription>
                    Configure your audio lecture options
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-[#223366]">
                      Lecture Title
                    </Label>
                    <Input
                      id="title"
                      placeholder="Enter a title for your audio lecture"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      className="w-full"
                    />
                  </div>

                  {/* Voice Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="voice" className="text-[#223366]">
                      Voice
                    </Label>
                    <Select
                      value={voice}
                      onValueChange={(value) => setVoice(value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a voice" />
                      </SelectTrigger>
                      <SelectContent>
                        {voiceOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Style Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="style" className="text-[#223366]">
                      Speaking Style
                    </Label>
                    <Select
                      value={style}
                      onValueChange={(value) => setStyle(value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a speaking style" />
                      </SelectTrigger>
                      <SelectContent>
                        {styleOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-[#223366]/70 mt-1">
                      The style affects how the AI will present the material
                    </p>
                  </div>

                  {/* Duration Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="duration" className="text-[#223366]">
                      Duration
                    </Label>
                    <Select
                      value={duration}
                      onValueChange={(value) => setDuration(value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select lecture duration" />
                      </SelectTrigger>
                      <SelectContent>
                        {durationOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Custom Duration Input (only shown when custom is selected) */}
                    {duration === "custom" && (
                      <div className="mt-4 bg-[#eaf0fa] p-4 rounded-md">
                        <Label
                          htmlFor="customDuration"
                          className="text-[#223366] mb-2 block"
                        >
                          Custom Duration (in seconds)
                        </Label>
                        <div className="flex items-center gap-3">
                          <Input
                            id="customDuration"
                            type="number"
                            min="60"
                            max="1800"
                            value={customDuration}
                            onChange={(e) => setCustomDuration(Number(e.target.value))}
                            className="w-full"
                          />
                          <div className="text-[#223366]">
                            <span className="font-medium">
                              {formatDuration(customDuration)}
                            </span>{" "}
                            min
                          </div>
                        </div>
                        <p className="text-xs text-[#223366]/70 mt-2">
                          Recommended: 120-900 seconds (2-15 minutes)
                        </p>
                      </div>
                    )}                </div>                {/* Language Options */}
                <div className="space-y-3">
                  <Label className="text-[#223366]">Language & Content Generation</Label>
                  
                  <div className="bg-[#eaf0fa] p-4 rounded-md space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="translateToArabic"
                        checked={translateToArabic}
                        onChange={(e) => setTranslateToArabic(e.target.checked)}
                        className="h-4 w-4 text-[#2563eb] border-gray-300 rounded focus:ring-[#2563eb]"
                      />
                      <Label 
                        htmlFor="translateToArabic" 
                        className="text-sm text-[#223366] cursor-pointer"
                      >
                        Generate content in Arabic
                      </Label>
                    </div>
                    
                    <p className="text-xs text-[#223366]/70">
                      If enabled, the lecture content will be generated directly in Arabic by AI for better 
                      context and natural flow. The audio will then be created using Fanar's Arabic TTS.
                    </p>
                  </div>
                </div>

                {/* Material info */}
                <div className="bg-[#eaf0fa] p-4 rounded-md mt-2">
                  <div className="flex items-center mb-2">
                    <FileAudio className="h-5 w-5 text-[#2563eb] mr-2" />
                    <h3 className="font-medium text-[#223366]">
                      Material Source
                    </h3>
                  </div>
                  <p className="text-[#223366] text-sm">
                    Creating audio lecture from:{" "}
                    <strong>{material?.title || "Unknown Material"}</strong>
                  </p>
                  <Badge className="mt-2" variant="outline">
                    {material?.status || "Unknown Status"}
                  </Badge>
                </div>

                {/* Error message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md text-sm">
                    <div className="flex items-center mb-1">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      <span className="font-medium">Error</span>
                    </div>
                    <p>{error}</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t pt-6 flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => router.back()}
                  className="w-full sm:w-auto border-[#b3c6e0] text-[#223366]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="w-full sm:w-auto bg-gradient-to-r from-[#7eb6ff] to-[#2563eb] text-white font-bold border border-[#7eb6ff] shadow-lg transition-transform duration-200 hover:-translate-y-1 hover:shadow-2xl hover:from-[#2563eb] hover:to-[#7eb6ff] focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Audio Lecture
                </Button>
              </CardFooter>
            </Card>
          </div>
        </form>
      </div>
    </div>
  </div>
  );
};

export default AudioLectureCreatePage;
