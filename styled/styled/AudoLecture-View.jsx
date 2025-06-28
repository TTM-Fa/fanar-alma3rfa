"use client";
import React, { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import {
  File,
  FileText,
  FileAudio,
  Clock,
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Headphones,
  Loader,
  AlertCircle,
  List,
  Info,
  Download,
  RefreshCw,
} from "lucide-react";

const AudioLectureViewPage = () => {
  const [audioLecture, setAudioLecture] = useState(null);
  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(null);

  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const materialId = params.materialId;
  const lectureId = searchParams.get("lectureId");

  const audioRef = useRef(null);

  useEffect(() => {
    const fetchAudioLecture = async () => {
      if (!lectureId) {
        setError("Audio lecture ID is missing");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/audio-lecture/${lectureId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio lecture: ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
          const lecture = data.audioLecture;
          setAudioLecture(lecture);

          // Start polling if the lecture is still processing
          if (
            lecture.status === "processing" ||
            lecture.status === "generating-audio"
          ) {
            startStatusPolling(lectureId);
          }

          // Fetch material details if not included
          if (lecture.material) {
            setMaterial({
              id: lecture.material.id,
              title: lecture.material.title || "Untitled Material",
            });
          } else {
            // If material details are not included, fetch them separately
            const materialResponse = await fetch(
              `/api/materials/${materialId}`
            );
            if (materialResponse.ok) {
              const materialData = await materialResponse.json();
              if (materialData.success) {
                setMaterial({
                  id: materialData.material_id,
                  title: materialData.title || "Untitled Material",
                });
              }
            }
          }
        } else {
          throw new Error(data.error || "Failed to fetch audio lecture");
        }
      } catch (error) {
        console.error("Error fetching audio lecture:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAudioLecture();

    // Clean up any polling interval on unmount
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [lectureId, materialId]);

  const startStatusPolling = (id) => {
    setIsPolling(true);
    // Poll every 3 seconds
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/audio-lecture/${id}/status`);
        if (!response.ok) {
          throw new Error("Failed to check status");
        }

        const data = await response.json();
        if (data.success) {
          const updatedLecture = data.audioLecture;
          setAudioLecture(updatedLecture);

          // If it's ready or error, stop polling
          if (
            updatedLecture.status === "ready" ||
            updatedLecture.status === "error"
          ) {
            clearInterval(interval);
            setIsPolling(false);
            setPollingInterval(null);
          }
        }
      } catch (error) {
        console.error("Error polling status:", error);
        // If there's an error, stop polling
        clearInterval(interval);
        setIsPolling(false);
        setPollingInterval(null);
      }
    }, 3000);

    setPollingInterval(interval);
  };

  // Audio player controls
  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    const seekTime = (e.target.value / 100) * duration;
    setCurrentTime(seekTime);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(
        audioRef.current.currentTime + 10,
        duration
      );
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(
        audioRef.current.currentTime - 10,
        0
      );
    }
  };

  // Format time in MM:SS
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const calculateProgress = () => {
    if (duration === 0) return 0;
    return (currentTime / duration) * 100;
  };

  const getStatusBadgeColor = (status) => {
    const statusColors = {
      ready: "bg-blue-100 text-blue-800",
      processing: "bg-blue-100 text-blue-800",
      "generating-audio": "bg-purple-100 text-purple-800",
      error: "bg-red-100 text-red-800",
    };
    return statusColors[status] || "bg-gray-100 text-gray-800";
  };

  const handleDownload = () => {
    if (audioLecture?.audioUrl) {
      const link = document.createElement("a");
      link.href = audioLecture.audioUrl;
      const fileName = `${audioLecture.title
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase()}.mp3`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <Loader className="h-12 w-12 text-[#2563eb] animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-medium text-[#223366]">
            Loading audio lecture...
          </h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h2 className="text-xl font-medium text-[#223366] mb-2">
            Error Loading Audio Lecture
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

  if (!audioLecture) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-[#223366] mb-2">
            Audio Lecture Not Found
          </h2>
          <p className="text-[#223366] mb-6">
            We couldn't find the requested audio lecture.
          </p>
          <div className="flex flex-col space-y-2">
            <Button
              onClick={() => router.push(`/audio-lecture/${materialId}/list`)}
              className="bg-gradient-to-r from-[#7eb6ff] to-[#2563eb] text-white font-bold border border-[#7eb6ff] shadow-lg transition-transform duration-200 hover:-translate-y-1 hover:shadow-2xl hover:from-[#2563eb] hover:to-[#7eb6ff] focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2"
            >
              <List className="mr-2 h-4 w-4" />
              View All Audio Lectures
            </Button>
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="border-[#b3c6e0] text-[#223366]"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Processing/generating state
  if (
    audioLecture.status === "processing" ||
    audioLecture.status === "generating-audio"
  ) {
    return (
      <div className="min-h-screen bg-white flex flex-col p-6 md:p-10">
        <div className="max-w-lg mx-auto w-full">
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

          <Card className="shadow-md bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <FileAudio className="h-5 w-5 mr-2 text-[#2563eb]" />
                  {audioLecture.title}
                </CardTitle>
                <Badge className={getStatusBadgeColor(audioLecture.status)}>
                  {audioLecture.status === "processing"
                    ? "Processing"
                    : "Generating Audio"}
                </Badge>
              </div>
              <CardDescription>
                Your audio lecture is currently being generated
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>
                    {audioLecture.status === "processing"
                      ? "Creating lecture script..."
                      : "Converting script to speech..."}
                  </span>
                  <span>
                    {audioLecture.status === "processing" ? "30%" : "60%"}
                  </span>
                </div>
                <Progress
                  value={audioLecture.status === "processing" ? 30 : 60}
                  className="h-2"
                />
              </div>

              <div className="flex justify-center">
                <div className="animate-pulse text-[#2563eb]">
                  <Loader className="h-16 w-16 animate-spin" />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-md border border-blue-100 text-sm text-blue-800">
                <div className="flex items-start">
                  <Info className="h-4 w-4 mr-2 mt-0.5" />
                  <div>
                    <p>
                      <strong>Please wait:</strong> Audio generation can take
                      several minutes depending on the length of your material.
                    </p>
                    {isPolling && (
                      <p className="mt-1 text-xs flex items-center">
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Auto-refreshing status...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => router.push(`/audio-lecture/${materialId}/list`)}
                className="border-[#b3c6e0] text-[#223366]"
              >
                <List className="mr-2 h-4 w-4" />
                All Audio Lectures
              </Button>
              <Button
                className="bg-gradient-to-r from-[#7eb6ff] to-[#2563eb] text-white font-bold border border-[#7eb6ff] shadow-lg transition-transform duration-200 hover:-translate-y-1 hover:shadow-2xl hover:from-[#2563eb] hover:to-[#7eb6ff] focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Status
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (audioLecture.status === "error") {
    return (
      <div className="min-h-screen bg-white flex flex-col p-6 md:p-10">
        <div className="max-w-lg mx-auto w-full">
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

          <Card className="shadow-md bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <FileAudio className="h-5 w-5 mr-2 text-[#2563eb]" />
                  {audioLecture.title}
                </CardTitle>
                <Badge className="bg-red-100 text-red-800">Error</Badge>
              </div>
              <CardDescription>
                There was a problem generating this audio lecture
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center py-4">
                <AlertCircle className="h-16 w-16 text-red-500" />
              </div>

              <div className="bg-red-50 p-4 rounded-md border border-red-100 text-sm text-red-800">
                <p>
                  <strong>Generation Error:</strong> We encountered a problem
                  while generating this audio lecture. This could be due to
                  various reasons such as content length, server issues, or
                  unsupported content.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => router.push(`/audio-lecture/${materialId}/list`)}
                className="border-[#b3c6e0] text-[#223366]"
              >
                <List className="mr-2 h-4 w-4" />
                All Audio Lectures
              </Button>
              <Button
                className="bg-gradient-to-r from-[#7eb6ff] to-[#2563eb] text-white font-bold border border-[#7eb6ff] shadow-lg transition-transform duration-200 hover:-translate-y-1 hover:shadow-2xl hover:from-[#2563eb] hover:to-[#7eb6ff] focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2"
                onClick={() =>
                  router.push(`/audio-lecture/${materialId}/create`)
                }
              >
                <FileAudio className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // Ready state (normal view)
  return (
    <div className="min-h-screen bg-white flex flex-col p-6 md:p-10">
      <div className="max-w-4xl mx-auto w-full">
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#223366] mb-2">
                Audio Lecture
              </h1>
              <p className="text-[#223366]">Listen to your audio lecture</p>
            </div>
            <Badge
              className={
                getStatusBadgeColor(audioLecture.status) + " mt-2 md:mt-0"
              }
            >
              {audioLecture.status === "ready" ? "Ready" : audioLecture.status}
            </Badge>
          </div>
        </div>

        {/* Audio Player Card */}
        <Card className="bg-white shadow-md mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Headphones className="h-5 w-5 mr-2 text-[#2563eb]" />
              {audioLecture.title}
            </CardTitle>
            <CardDescription>
              {material?.title && `Based on material: ${material.title}`}
              {audioLecture.voice && ` • Voice: ${audioLecture.voice}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Audio Element (hidden) */}
            <audio
              ref={audioRef}
              src={audioLecture.audioUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />

            {/* Audio Player UI */}
            <div className="bg-gradient-to-br from-[#eaf0fa] to-[#b3c6e0] rounded-lg p-6">
              {/* Album Art / Audio Icon */}
              <div className="flex justify-center mb-6">
                <div className="bg-white rounded-full p-8 shadow-md">
                  <Headphones className="h-16 w-16 text-[#2563eb]" />
                </div>
              </div>

              {/* Player Controls */}
              <div className="space-y-5">
                {/* Time and Progress */}
                <div className="space-y-2">
                  <div className="h-2 bg-[#b3c6e0] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#2563eb] rounded-full"
                      style={{ width: `${calculateProgress()}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm text-[#223366]">
                    <span>{formatTime(currentTime)}</span>
                    <span>
                      {formatTime(duration || audioLecture.duration || 0)}
                    </span>
                  </div>
                </div>

                {/* Slider (for seeking) */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={calculateProgress()}
                  onChange={handleSeek}
                  className="w-full h-1 bg-[#b3c6e0] rounded-lg appearance-none cursor-pointer"
                />

                {/* Control Buttons */}
                <div className="flex justify-center items-center space-x-6">
                  <button
                    onClick={skipBackward}
                    className="p-2 rounded-full hover:bg-[#eaf0fa]"
                  >
                    <SkipBack className="h-6 w-6 text-[#2563eb]" />
                  </button>
                  <button
                    onClick={handlePlayPause}
                    className="p-4 bg-[#2563eb] rounded-full hover:bg-[#223366] shadow-md"
                  >
                    {isPlaying ? (
                      <Pause className="h-8 w-8 text-white" />
                    ) : (
                      <Play className="h-8 w-8 text-white" />
                    )}
                  </button>
                  <button
                    onClick={skipForward}
                    className="p-2 rounded-full hover:bg-[#eaf0fa]"
                  >
                    <SkipForward className="h-6 w-6 text-[#2563eb]" />
                  </button>
                </div>
              </div>
            </div>

            {/* Audio Info */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center text-sm text-[#223366]">
                <Info className="h-4 w-4 mr-2" />
                <span>
                  Created: {new Date(audioLecture.createdAt).toLocaleDateString()}
                </span>
              </div>
              {(audioLecture.duration || duration) && (
                <div className="flex items-center text-sm text-[#223366] mt-1">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>
                    Duration: {Math.floor((audioLecture.duration || duration) / 60)} min {(audioLecture.duration || duration) % 60} sec
                  </span>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                className="border-[#b3c6e0] text-[#223366]"
                onClick={() => router.push(`/audio-lecture/${materialId}/list`)}
              >
                <List className="mr-2 h-4 w-4" />
                All Lectures
              </Button>
              <Button
                variant="outline"
                className="border-[#b3c6e0] text-[#223366]"
                onClick={handleDownload}
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
            <Button
              className="bg-gradient-to-r from-[#7eb6ff] to-[#2563eb] text-white font-bold border border-[#7eb6ff] shadow-lg transition-transform duration-200 hover:-translate-y-1 hover:shadow-2xl hover:from-[#2563eb] hover:to-[#7eb6ff] focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2"
              onClick={() => router.push(`/materials/${materialId}`)}
            >
              <FileText className="mr-2 h-4 w-4" />
              View Material
            </Button>
          </CardFooter>
        </Card>

        {/* Tips Card */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-blue-800 mb-3 flex items-center">
              <Info className="h-5 w-5 mr-2" />
              Audio Learning Tips
            </h3>
            <ul className="space-y-2 text-blue-700">
              <li className="flex items-start">
                <span className="bg-blue-200 rounded-full w-5 h-5 flex items-center justify-center text-xs text-blue-800 mr-2 mt-0.5">
                  1
                </span>
                <span>
                  Listen actively - take notes or jot down key concepts
                </span>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-200 rounded-full w-5 h-5 flex items-center justify-center text-xs text-blue-800 mr-2 mt-0.5">
                  2
                </span>
                <span>
                  Use the 10-second skip buttons to review challenging sections
                </span>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-200 rounded-full w-5 h-5 flex items-center justify-center text-xs text-blue-800 mr-2 mt-0.5">
                  3
                </span>
                <span>
                  Combine listening with reading the summary for better
                  retention
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AudioLectureViewPage;
