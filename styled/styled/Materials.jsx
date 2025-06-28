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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  GraduationCap,
  MapPin,
  Share2,
  Download,
  ExternalLink,
  Clipboard,
  CheckCircle,
  Edit,
  Loader,
  ListChecks,
  Code,
} from "lucide-react";

const MaterialDetailsPage = () => {
  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);
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
          setMaterial({
            id: data.material_id,
            title: data.title,
            fileName: data.fileName,
            type: data.type,
            link: data.link,
            status: data.material_status,
            rawContent: data.rawContent,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            studySessionId: data.studySessionId, // Add session ID
          });
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFileIcon = (type) => {
    if (!type) return <File className="h-10 w-10 text-gray-600" />;

    const fileTypeIcons = {
      "application/pdf": <FileText className="h-10 w-10 text-blue-600" />,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        <FileText className="h-10 w-10 text-blue-600" />,
      "video/mp4": <FileVideo className="h-10 w-10 text-purple-600" />,
      "audio/mpeg": <FileAudio className="h-10 w-10 text-emerald-600" />,
      "audio/wav": <FileAudio className="h-10 w-10 text-emerald-600" />,
      youtube: <Youtube className="h-10 w-10 text-red-600" />,
      default: <File className="h-10 w-10 text-gray-600" />,
    };

    // Special handling for YouTube links
    if (
      material?.link?.includes("youtube.com") ||
      material?.link?.includes("youtu.be")
    ) {
      return fileTypeIcons.youtube;
    }

    return fileTypeIcons[type] || fileTypeIcons.default;
  };

  const getStatusBadgeColor = (status) => {
    const statusColors = {
      ready: "bg-green-100 text-green-800",
      Ready: "bg-green-100 text-green-800",
      processing: "bg-blue-100 text-blue-800",
      Processing: "bg-blue-100 text-blue-800",
      "Converting to text": "bg-blue-100 text-blue-800",
      error: "bg-red-100 text-red-800",
      unsupported: "bg-orange-100 text-orange-800",
      uploading: "bg-gray-100 text-gray-800",
    };

    return statusColors[status] || "bg-gray-100 text-gray-800";
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setShowShareTooltip(true);
        setTimeout(() => setShowShareTooltip(false), 2000);
      })
      .catch((err) => {
        console.error("Could not copy URL: ", err);
      });
  };

  const handleDownload = () => {
    // If material has a direct link (like a PDF URL), use that for download
    if (
      material.link &&
      (material.link.includes(".pdf") ||
        material.link.includes(".doc") ||
        material.link.includes(".txt") ||
        material.link.includes("/download"))
    ) {
      // Create a link element
      const a = document.createElement("a");
      a.href = material.link;
      a.download = material.fileName || material.title || "download";
      a.target = "_blank";

      // Append to the document, click it, and remove it
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // Fall back to raw content if there's no direct download link
    if (!material.rawContent) return;

    // Create filename from material title
    const filename = `${material.title
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()}.txt`;

    // Create a blob with the content
    const blob = new Blob([material.rawContent], { type: "text/plain" });

    // Create a temporary URL for the blob
    const url = URL.createObjectURL(blob);

    // Create a link element
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;

    // Append to the document, click it, and remove it
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Revoke the URL to free up memory
    URL.revokeObjectURL(url);
  };

  // Helper to clean file name (remove unique IDs, keep clean name)
  const getCleanFileName = (fileName) => {
    if (!fileName) return "";
    // Remove UUID/hash patterns (e.g. abc1234-...-filename.pdf or filename-abc1234.pdf or 123e4567-e89b-12d3-a456-426614174000-...)
    // Remove leading/trailing/middle hashes/ids before extension
    // Remove multiple consecutive hashes/ids
    // Clean up extra dashes/underscores
    return fileName
      .replace(/(^|[-_\.])([0-9a-f]{8,}|[0-9a-z]{6,})(?=[-_.])/gi, "") // Remove hashes/ids at start or between
      .replace(/([0-9a-f]{8,}|[0-9a-z]{6,})(?=\.[a-z0-9]+$)/gi, "") // Remove hash/id before extension
      .replace(/[-_]{2,}/g, "-") // Replace multiple dashes/underscores with single dash
      .replace(/^[-_]+|[-_]+$/g, "") // Trim leading/trailing dashes/underscores
      .replace(/_/g, " ") // Replace underscores with spaces
      .trim();
  };

  const actionCards = [
    {
      title: "View Quizzes",
      description:
        "View and create quizzes based on this material to test your knowledge",
      icon: <ListChecks className="h-8 w-8 text-white" />,
      color: "from-purple-500 to-indigo-600",
      disabled: material?.status !== "Ready" && material?.status !== "ready",
      path: `/quiz/${materialId}/list`,
    },
    {
      title: "Chat with Material",
      description:
        "Ask questions and get answers about this material through AI chat",
      icon: <Brain className="h-8 w-8 text-white" />,
      color: "from-blue-500 to-cyan-600",
      disabled: material?.status !== "Ready" && material?.status !== "ready",
      path: `/chat/${materialId}`,
    },
    {
      title: "View Flashcards",
      description:
        "View and create flashcards with key concepts for quick review",
      icon: <Clipboard className="h-8 w-8 text-white" />,
      color: "from-amber-500 to-orange-600",
      disabled: material?.status !== "Ready" && material?.status !== "ready",
      path: `/flashcards/${materialId}/list`,
    },
    {
      title: "View Summaries",
      description:
        "Get an AI-generated summary of this material's key points and concepts",
      icon: <FileText className="h-8 w-8 text-white" />,
      color: "from-rose-500 to-pink-600",
      disabled: material?.status !== "Ready" && material?.status !== "ready",
      path: `/summary/${materialId}/list`,
    },
    {
      title: "Code Mentor",
      description:
        "Get AI-powered code explanations, tracing, and visualizations to understand your code better",
      icon: <Code className="h-8 w-8 text-white" />,
      color: "from-blue-500 to-indigo-600",
      disabled: false,
      path: `/code-mentor/${materialId}`,
    },
    {
      title: "Audio Lectures",
      description:
        "Listen to AI-generated audio lectures explaining the material",
      icon: <FileAudio className="h-8 w-8 text-white" />,
      color: "from-teal-500 to-emerald-600",
      disabled: material?.status !== "Ready" && material?.status !== "ready",
      path: `/audio-lecture/${materialId}/list`,
    },
  ];

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

  if (!material) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="text-amber-500 text-5xl mb-4">?</div>
          <h2 className="text-xl font-medium text-gray-800 mb-2">
            Material Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            The requested material could not be found or may have been deleted.
          </p>
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

  return (
    <div className="min-h-screen bg-white flex flex-col p-6 md:p-10 relative overflow-hidden font-sans text-[#142042]">
      {/* Navy blue background blobs */}
      <div className="absolute top-0 left-0 w-1/3 h-1/3 bg-[#223366] rounded-full filter blur-3xl opacity-10 -z-10 -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-[#0a1833] rounded-full filter blur-3xl opacity-10 -z-10 translate-x-1/4 translate-y-1/4"></div>
      <div className="max-w-6xl w-full mx-auto">
        <div className="rounded-3xl bg-[#d3e0f7] p-6 md:p-10 shadow-xl mb-8 border border-[#223366]/30">
          {/* Back button */}
          <Button
            variant="ghost"
            onClick={() => {
              if (material && material.studySessionId) {
                router.push(`/upload_materials/${material.studySessionId}`);
              } else {
                router.push("/sessions");
              }
            }}
            className="mb-6 text-[#223366] hover:text-white hover:bg-[#223366] font-bold"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {/* Material header */}
          <div className="bg-[#142042] rounded-xl shadow-md overflow-hidden mb-8">
            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="p-4 rounded-xl bg-gradient-to-br from-[#223366] to-[#7a8ca7] flex items-center justify-center">
                  {getFileIcon(material.type)}
                </div>
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h1 className="text-2xl md:text-3xl font-bold text-white">
                      {getCleanFileName(material.title) || "Untitled Material"}
                    </h1>
                    <Badge
                      className={`text-sm bg-[#223366] text-[#b3c6e0] border-0 font-bold`}
                    >
                      {material.status || "Unknown"}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-[#b3c6e0]">
                    {material.fileName && (
                      <div className="flex items-center gap-2">
                        <File className="h-4 w-4 text-[#7a8ca7]" />
                        <span className="truncate max-w-xs">
                          {getCleanFileName(material.fileName)}
                        </span>
                      </div>
                    )}
                    {material.link && (
                      <div className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4 text-[#7a8ca7]" />
                        <a
                          href={material.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate max-w-xs hover:text-[#b3c6e0] hover:underline"
                        >
                          {material.link}
                        </a>
                      </div>
                    )}
                    {material.createdAt && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-[#7a8ca7]" />
                        <span>Added: {formatDate(material.createdAt)}</span>
                      </div>
                    )}
                    {material.type && (
                      <div className="flex items-center gap-2">
                        <File className="h-4 w-4 text-[#7a8ca7]" />
                        <span>Type: {material.type}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Material content preview */}
          {material.rawContent && (
            <div className="relative z-50">
              <Card className="mb-8 bg-[#223366] shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <FileText className="h-5 w-5 mr-2 text-[#b3c6e0]" />
                    Content Preview
                  </CardTitle>
                  <CardDescription className="text-[#b3c6e0]">
                    Preview of the extracted content from this material
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-white p-4 rounded-md border border-white max-h-80 overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap text-[#142042] font-mono">
                      {showFullContent
                        ? material.rawContent
                        : material.rawContent.length > 1000
                        ? `${material.rawContent.substring(0, 1000)}...`
                        : material.rawContent}
                    </pre>
                  </div>
                </CardContent>
                <CardFooter className="justify-end">
                  <Button
                    variant="outline"
                    className="text-sm text-[#223366] border-[#223366] font-bold bg-white hover:bg-[#eaf0fa]"
                    onClick={(event) => {
                      event.stopPropagation();
                      event.preventDefault();
                      event.nativeEvent.stopImmediatePropagation();
                      setShowFullContent(!showFullContent);
                    }}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-2" />
                    {showFullContent ? "Hide Full Content" : "View Full Content"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          )}

          {/* Material status */}
          {material.status &&
            material.status !== "Ready" &&
            material.status !== "ready" && (
              <Card className="mb-8 bg-[#eaf0fa] shadow-md border-[#223366]">
                <CardContent className="p-6">
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[#223366] font-bold">
                        {material.status}
                      </span>
                      <span className="text-[#223366] font-bold">
                        {material.status === "Processing"
                          ? "75%"
                          : material.status === "Converting to text"
                          ? "80%"
                          : material.status === "Skimming Through"
                          ? "85%"
                          : material.status === "Summarizing"
                          ? "95%"
                          : "50%"}
                      </span>
                    </div>
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
                      className="h-2 bg-[#b3c6e0]"
                    />
                    <p className="text-sm text-[#223366] mt-2">
                      Your material is still being processed. Some features may be
                      unavailable until processing is complete.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Actions Section */}
          <h2 className="text-2xl font-bold text-[#223366] mb-6">
            Available Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {actionCards.map((action, index) => (
              <div key={index} className="h-full">
                <Button
                  variant="ghost"
                  className={`p-0 h-full w-full group ${
                    action.disabled ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                  onClick={() => !action.disabled && router.push(action.path)}
                  disabled={action.disabled}
                >
                  <Card className="w-full h-full relative bg-[#142042] border-[#223366]">
                    <div
                      className={`absolute top-0 left-0 w-full h-full bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity`}
                    />
                    <CardContent className="p-6 flex flex-col h-full">
                      <div
                        className={`p-4 rounded-full bg-gradient-to-br ${action.color} self-start mb-4`}
                      >
                        {action.icon}
                      </div>
                      <h3 className="text-xl font-bold text-[#b3c6e0] mb-2">
                        {action.title}
                      </h3>
                      <p className="text-[#7a8ca7] mb-6 whitespace-normal">
                        {action.description}
                      </p>
                      <div className="mt-auto pt-2">
                        {action.disabled ? (
                          <div className="w-full py-2 px-4 text-center bg-[#eaf0fa] opacity-50 rounded-md text-[#223366] font-bold">
                            Currently Unavailable
                          </div>
                        ) : (
                          <div
                            className={`w-full py-2 px-4 text-center bg-gradient-to-r ${action.color} text-white rounded-md hover:shadow-md font-bold`}
                          >
                            {action.title}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Button>
              </div>
            ))}
          </div>

          {/* Utility actions */}
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              variant="outline"
              className="border-[#223366] text-[#223366] font-bold no-loading bg-white hover:bg-[#eaf0fa]"
              onClick={handleShare}
            >
              {showShareTooltip ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Material
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="border-[#223366] text-[#223366] font-bold no-loading bg-white hover:bg-[#eaf0fa]"
              onClick={handleDownload}
              disabled={!material.rawContent}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Content
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaterialDetailsPage;