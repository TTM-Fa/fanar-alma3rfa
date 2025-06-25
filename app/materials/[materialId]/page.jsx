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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col p-6 md:p-10">
      <div className="max-w-6xl w-full mx-auto">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => {
            // If material has a studySessionId, navigate to the upload materials page for that session
            if (material && material.studySessionId) {
              router.push(`/upload_materials/${material.studySessionId}`);
            } else {
              // Fall back to going back to all sessions
              router.push("/sessions");
            }
          }}
          className="mb-6 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {/* Material header */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
                {getFileIcon(material.type)}
              </div>
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                    {material.title || "Untitled Material"}
                  </h1>
                  <Badge
                    className={`text-sm ${getStatusBadgeColor(
                      material.status
                    )}`}
                  >
                    {material.status || "Unknown"}
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                  {material.fileName && (
                    <div className="flex items-center gap-2">
                      <File className="h-4 w-4 text-gray-400" />
                      <span className="truncate max-w-xs">
                        {material.fileName}
                      </span>
                    </div>
                  )}
                  {material.link && (
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4 text-gray-400" />
                      <a
                        href={material.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate max-w-xs hover:text-indigo-600 hover:underline"
                      >
                        {material.link}
                      </a>
                    </div>
                  )}
                  {material.createdAt && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>Added: {formatDate(material.createdAt)}</span>
                    </div>
                  )}
                  {material.type && (
                    <div className="flex items-center gap-2">
                      <File className="h-4 w-4 text-gray-400" />
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
          <div
            className="relative z-50"
            onClick={(e) => {
              // Completely stop propagation and prevent default at the container level
              e.stopPropagation();
              e.preventDefault();
              e.nativeEvent.stopImmediatePropagation();
            }}
          >
            <Card className="mb-8 bg-white shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-indigo-600" />
                  Content Preview
                </CardTitle>
                <CardDescription>
                  Preview of the extracted content from this material
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200 max-h-80 overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap text-gray-700 font-mono">
                    {showFullContent
                      ? material.rawContent
                      : material.rawContent.length > 1000
                      ? `${material.rawContent.substring(0, 1000)}...`
                      : material.rawContent}
                  </pre>
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                <div
                  onClick={(e) => {
                    // Additional click handler for the button container
                    e.stopPropagation();
                    e.preventDefault();
                    e.nativeEvent.stopImmediatePropagation();
                  }}
                >
                  <Button
                    variant="outline"
                    className="text-sm no-loading"
                    onClick={(event) => {
                      // Triple protection: stop propagation, prevent default, and stop immediate propagation
                      event.stopPropagation();
                      event.preventDefault();
                      event.nativeEvent.stopImmediatePropagation();
                      setShowFullContent(!showFullContent);
                    }}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-2" />
                    {showFullContent
                      ? "Hide Full Content"
                      : "View Full Content"}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* Material status */}
        {material.status &&
          material.status !== "Ready" &&
          material.status !== "ready" && (
            <Card className="mb-8 bg-white shadow-md border-blue-100">
              <CardContent className="p-6">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-700 font-medium">
                      {material.status}
                    </span>
                    <span className="text-blue-700 font-medium">
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
                    className="h-2"
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    Your material is still being processed. Some features may be
                    unavailable until processing is complete.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

        {/* Actions Section */}
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Available Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {actionCards.map((action, index) => (
            <div key={index} className="h-full">
              <Button
                variant="ghost"
                className={`p-0 h-full w-full ${
                  action.disabled ? "opacity-60 cursor-not-allowed" : ""
                }`}
                onClick={() => !action.disabled && router.push(action.path)}
                disabled={action.disabled}
              >
                <Card className="w-full h-full">
                  <div
                    className={`absolute top-0 left-0 w-full h-full bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-5 transition-opacity`}
                  />
                  <CardContent className="p-6 flex flex-col h-full">
                    <div
                      className={`p-4 rounded-full bg-gradient-to-br ${action.color} self-start mb-4`}
                    >
                      {action.icon}
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      {action.title}
                    </h3>
                    <p className="text-gray-600 mb-6 whitespace-normal">
                      {action.description}
                    </p>
                    <div className="mt-auto pt-2">
                      {action.disabled ? (
                        <div className="w-full py-2 px-4 text-center bg-gray-200 opacity-50 rounded-md text-gray-700">
                          Currently Unavailable
                        </div>
                      ) : (
                        <div
                          className={`w-full py-2 px-4 text-center bg-gradient-to-r ${action.color} text-white rounded-md hover:shadow-md`}
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
            className="border-gray-300 no-loading"
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
            className="border-gray-300 no-loading"
            onClick={handleDownload}
            disabled={!material.rawContent}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Content
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MaterialDetailsPage;
