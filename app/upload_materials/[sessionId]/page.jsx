"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { useParams, useRouter } from "next/navigation";
import {
  File,
  X,
  Link,
  Youtube,
  FileText,
  FileAudio,
  FileVideo,
  Trash2,
  Loader,
  CheckCircle,
  Image,
  Clock,
  Brain,
  Sparkles,
  Book,
  PenTool,
  FlaskConical,
  Share2,
  Download,
  MoreHorizontal,
  ExternalLink,
} from "lucide-react";
import { upload } from "@vercel/blob/client";

// Upload file (PDF or audio) using Vercel Blob - this returns a blob object containing an "id" for polling
async function uploadFile(file, setProcessingStatus, sessionId) {
  // Here we set an initial temporary status
  const tempMaterialId = Math.random().toString(36).substring(7);
  const isAudio = file.type.startsWith("audio/");

  setProcessingStatus((prev) => ({
    ...prev,
    [tempMaterialId]: {
      progress: 0,
      statusText: "Uploading",
      phase: 0,
      error: null,
      type: isAudio ? "audio" : "file",
    },
  }));

  try {
    // Upload the file to Vercel Blob
    const blob = await upload(file.name, file, {
      access: "public",
      handleUploadUrl: `/api/materials/upload?sessionId=${sessionId}`,
      onUploadProgress: (progress) => {
        // Update progress during upload
        setProcessingStatus((prev) => ({
          ...prev,
          [tempMaterialId]: {
            ...prev[tempMaterialId],
            progress: Math.round(progress * 50), // Scale to 0-50% for upload phase
            statusText: "Uploading",
            phase: 0,
          },
        }));
      },
    });

    // Update status after successful upload
    setProcessingStatus((prev) => ({
      ...prev,
      [tempMaterialId]: {
        ...prev[tempMaterialId],
        progress: 50,
        statusText: isAudio ? "Transcribing audio" : "Processing",
        phase: 1,
      },
    }));

    console.log("Upload complete, blob response:", blob);

    // The materialId might not be immediately available in the blob response
    // We need to make a separate request to get the material ID from the server
    if (!blob.materialId) {
      // We'll use the URL to identify the material later
      const blobUrl = blob.url;
      const fileName = blob.pathname || blobUrl.split("/").pop();

      // Wait briefly to allow the server to finish processing and creating the DB record
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Make a request to get the material ID for this file
      try {
        const getMaterialRes = await fetch(
          `/api/materials/create?fileName=${encodeURIComponent(
            fileName
          )}&sessionId=${sessionId}`
        );
        if (!getMaterialRes.ok) {
          throw new Error(
            `Failed to get material ID: ${getMaterialRes.status}`
          );
        }

        const materialData = await getMaterialRes.json();
        if (materialData.success && materialData.materialId) {
          blob.materialId = materialData.materialId;
          console.log("Retrieved material ID:", materialData.materialId);
        } else {
          throw new Error("Material ID not returned from server");
        }
      } catch (idError) {
        console.error("Error getting material ID:", idError);
        throw new Error(`Failed to get material ID: ${idError.message}`);
      }
    }

    const materialId = blob.materialId;
    console.log("Final material ID for polling:", materialId);

    if (!materialId) {
      throw new Error(
        "Failed to get material ID from server response. Make sure the server is returning a materialId property in the response."
      );
    }

    // Update the processing status with the new permanent ID
    if (materialId !== tempMaterialId) {
      setProcessingStatus((prev) => {
        const newStatus = { ...prev };
        // Copy the status from the temp ID to the permanent ID
        newStatus[materialId] = { ...newStatus[tempMaterialId] };
        // Remove the temporary ID entry
        delete newStatus[tempMaterialId];
        return newStatus;
      });
    }

    // Start polling the material status after upload is complete
    pollMaterialStatus(materialId, setProcessingStatus);
    return materialId;
  } catch (error) {
    console.error("Error uploading file:", error);
    // Update status on error
    setProcessingStatus((prev) => ({
      ...prev,
      [tempMaterialId]: {
        ...prev[tempMaterialId],
        statusText: "Upload Failed",
        error: error.message || "File upload failed",
        phase: -1,
      },
    }));
    return null;
  }
}

// Poll the material status every 3 seconds by calling /api/materials/[materialId]
function pollMaterialStatus(materialId, setProcessingStatus) {
  let attempts = 0;
  const maxAttempts = 20; // Maximum number of polling attempts (60 seconds total)

  console.log(`Starting polling for material ID: ${materialId}`);

  const interval = setInterval(async () => {
    try {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(interval);
        setProcessingStatus((prev) => ({
          ...prev,
          [materialId]: {
            ...prev[materialId],
            statusText: "Processing Timed Out",
            error: "Processing took too long. Check your material later.",
            phase: -1,
          },
        }));
        return;
      }

      console.log(`Polling attempt ${attempts} for material ID: ${materialId}`);
      const apiUrl = `/api/materials/${materialId}`;
      console.log(`Calling API: ${apiUrl}`);

      const res = await fetch(apiUrl);

      if (!res.ok) {
        const errorText = await res
          .text()
          .catch(() => "Failed to get error details");
        console.error(`API Error (${res.status}): ${errorText}`);

        // Handle 404 specifically - likely means the material wasn't created properly
        if (res.status === 404) {
          setProcessingStatus((prev) => ({
            ...prev,
            [materialId]: {
              ...prev[materialId],
              statusText: "Material Not Found",
              error:
                "The uploaded material could not be found. There may be an issue with the server configuration.",
              phase: -1,
            },
          }));

          // Stop polling if we get a 404 after a few attempts
          if (attempts >= 3) {
            console.error("Stopping polling due to repeated 404 errors");
            clearInterval(interval);
            return;
          }
        }

        throw new Error(`API responded with status: ${res.status}`);
      }

      const data = await res.json();
      console.log(`Poll response for ${materialId}:`, data);

      if (!data.success) {
        throw new Error(data.error || "Unknown error checking material status");
      }

      // Map returned statuses to a progress value
      const statusMap = {
        "Not Found": 50,
        Processing: 75,
        "Converting to text": 80,
        "Skimming Through": 85,
        Summarizing: 95,
        Ready: 100,
      };

      const progress = statusMap[data.material_status] || 50;
      const phase = progress === 100 ? 4 : Math.floor(progress / 25);

      setProcessingStatus((prev) => ({
        ...prev,
        [materialId]: {
          ...prev[materialId],
          progress,
          statusText: data.material_status,
          phase,
          error: null,
        },
      }));

      if (data.material_status === "Ready") {
        clearInterval(interval);
      }
    } catch (err) {
      console.error(`Error polling material status for ${materialId}:`, err);
      // Don't clear the interval on error, just log it and continue trying
      setProcessingStatus((prev) => ({
        ...prev,
        [materialId]: {
          ...prev[materialId],
          statusText: "Checking Status...",
          error: null, // Don't show errors to user during polling, just keep trying
        },
      }));
    }
  }, 3000);

  // Return a cleanup function that clears the interval
  return () => clearInterval(interval);
}

// ---------------------
// Header Component
// ---------------------
const Header = () => (
  <header className="mb-8 text-center">
    <h1 className="text-3xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
      Upload Study Materials
    </h1>
    <p className="mt-2 text-gray-700">
      Manage your study resources with style and efficiency.
    </p>
  </header>
);

// ---------------------
// Session Header Component
// ---------------------
const SessionHeader = ({ sessionDetails, isLoading }) => {
  if (isLoading) {
    return (
      <Card className="bg-white shadow-lg border rounded-lg overflow-hidden transition mb-8">
        <CardContent className="p-6">
          <div className="flex flex-col gap-3 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="flex justify-between items-center mt-2">
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!sessionDetails) return null;

  return (
    <Card className="bg-white shadow-lg border rounded-lg overflow-hidden transition mb-8">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row justify-between">
          <div className="mb-4 md:mb-0">
            <h2 className="text-2xl font-semibold text-gray-800">
              {sessionDetails.title}
            </h2>
            <Badge className="mt-2 bg-blue-100 text-blue-800 hover:bg-blue-200">
              {sessionDetails.subject}
            </Badge>
            {sessionDetails.description && (
              <p className="text-gray-600 mt-2 line-clamp-2 md:line-clamp-none">
                {sessionDetails.description}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end justify-center text-sm">
            <div className="flex items-center text-gray-500 mb-1">
              <Clock className="h-4 w-4 mr-1" />
              <span>
                Created:{" "}
                {new Date(sessionDetails.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center text-gray-500">
              <File className="h-4 w-4 mr-1" />
              <span>
                {sessionDetails.materialsCount ||
                  sessionDetails.materials?.length ||
                  0}{" "}
                Materials
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ---------------------
// File Upload Component
// ---------------------
const FileUpload = ({ handleDrop, handleFileChange, fileInputId }) => (
  <Card className="bg-white shadow-lg border rounded-lg overflow-hidden transition hover:shadow-xl">
    <CardContent className="p-6">
      <h2 className="text-xl font-medium text-gray-800 mb-4">Upload Files</h2>
      <div
        className="border border-dashed rounded-lg p-6 text-center transition hover:border-gray-600 hover:bg-gray-50"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center">
          <div className="flex items-center space-x-2 mb-2">
            <FileText className="h-8 w-8 text-gray-600" />
            <FileAudio className="h-8 w-8 text-blue-600" />
          </div>
          <p className="text-gray-700">Drop your files here</p>
          <p className="text-sm text-gray-500 mb-2">Supported formats:</p>
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            <Badge variant="outline" className="bg-gray-100">
              PDF
            </Badge>
            <Badge variant="outline" className="bg-blue-100">
              MP3
            </Badge>
            <Badge variant="outline" className="bg-blue-100">
              WAV
            </Badge>
            <Badge variant="outline" className="bg-blue-100">
              M4A
            </Badge>
          </div>
          <Button
            onClick={() => document.getElementById(fileInputId).click()}
            className="mt-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white no-loading"
          >
            Browse Files
          </Button>
          <input
            id={fileInputId}
            type="file"
            className="hidden"
            multiple
            accept=".pdf,application/pdf,.mp3,audio/mpeg,.wav,audio/wav,.m4a,audio/x-m4a,audio/m4a"
            onChange={handleFileChange}
          />
        </div>
      </div>
      <p className="mt-4 text-xs text-gray-500">Max file size: 30MB</p>
    </CardContent>
  </Card>
);

// ---------------------
// Link Upload Component
// ---------------------
const LinkUpload = ({
  currentLink,
  setCurrentLink,
  handleAddLink,
  links,
  handleRemoveLink,
  youtubeLoading,
  disabled,
}) => (
  <Card className="bg-white shadow-lg border rounded-lg overflow-hidden transition hover:shadow-xl opacity-50 cursor-not-allowed">
    <CardContent className="p-6">
      <h2 className="text-xl font-medium text-gray-800 mb-4">Add Links</h2>
      <div className="flex space-x-2 mb-4">
        <Input
          placeholder="Feature temporarily disabled"
          value={currentLink}
          onChange={(e) => setCurrentLink(e.target.value)}
          disabled={true}
          className="flex-1 border"
        />
        <Button
          onClick={handleAddLink}
          disabled={true}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
        >
          Add
        </Button>
      </div>
      <div className="text-center p-4">
        <p className="text-sm text-gray-500">
          Link upload is currently disabled
        </p>
      </div>
    </CardContent>
  </Card>
);

// ---------------------
// File Preview Component
// ---------------------
const FilePreview = ({
  file,
  isUploading,
  processingStatus,
  processingPhases,
  formatFileSize,
  handleRemoveFile,
  getFileIcon,
}) => {
  const status = processingStatus[file.id] || {
    progress: 0,
    phase: 0,
    error: null,
  };

  // Determine if this is an audio file
  const isAudio = file.type.startsWith("audio/");
  const fileType = isAudio ? "audio" : "file";

  return (
    <div
      className="p-4 border rounded transition hover:shadow-md"
      style={{ borderColor: file.color }}
    >
      <div className="flex items-start">
        <div className="mr-4">
          <div
            className="p-2 rounded-full"
            style={{ backgroundColor: `${file.color}20` }}
          >
            {getFileIcon(file.type)}
          </div>
        </div>
        <div className="flex-1">
          <div className="flex justify-between mb-2">
            <span className="font-medium text-gray-800">{file.title}</span>
            <Badge
              variant="outline"
              className={`text-xs ${
                isAudio ? "bg-blue-100 text-blue-800" : ""
              }`}
            >
              {isAudio ? "Audio" : file.subject || "No subject"}
            </Badge>
          </div>
          {isUploading ? (
            <>
              {status.error ? (
                <div className="text-red-500 text-sm mt-2">{status.error}</div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm text-gray-600 mt-2 mb-1">
                    <span>
                      {status.statusText ||
                        processingPhases[fileType][status.phase || 0]}
                    </span>
                    <span>{status.progress}%</span>
                  </div>
                  <Progress value={status.progress} className="h-2" />
                </>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                {formatFileSize(file.size)}
              </p>
            </>
          )}
          <div className="flex justify-end mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveFile(file.id)}
              className="p-1"
              disabled={isUploading && !status.error}
            >
              <Trash2 className="h-4 w-4 text-gray-600" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------
// Link Preview Component
// ---------------------
const LinkPreview = ({
  link,
  isUploading,
  processingStatus,
  processingPhases,
  handleRemoveLink,
}) => {
  const status = processingStatus[link.id] || {
    progress: 0,
    phase: 0,
    error: null,
  };

  return (
    <div
      className="p-4 border rounded transition hover:shadow-md"
      style={{ borderColor: link.isYouTube ? "#B91C1C" : link.color }}
    >
      <div className="flex items-start">
        <div className="mr-4">
          {link.isYouTube ? (
            <div className="p-2 rounded-full bg-red-100">
              <Youtube className="h-8 w-8 text-red-600" />
            </div>
          ) : (
            <div
              className="p-2 rounded-full"
              style={{ backgroundColor: `${link.color}20` }}
            >
              <Link className="h-8 w-8" style={{ color: link.color }} />
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex justify-between mb-2">
            <span className="font-medium text-gray-800">{link.title}</span>
            <Badge variant="outline" className="text-xs">
              {link.subject || "No subject"}
            </Badge>
          </div>
          <p className="text-xs text-gray-600 truncate mb-1">{link.url}</p>
          {isUploading ? (
            <>
              {status.error ? (
                <div className="text-red-500 text-sm mt-2">{status.error}</div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm text-gray-600 mt-2 mb-1">
                    <span>
                      {status.statusText ||
                        processingPhases.link[status.phase || 0]}
                    </span>
                    <span>{status.progress}%</span>
                  </div>
                  <Progress value={status.progress} className="h-2" />
                </>
              )}
            </>
          ) : null}
          <div className="flex justify-end mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveLink(link.id)}
              className="p-1"
              disabled={isUploading && !status.error}
            >
              <Trash2 className="h-4 w-4 text-gray-600" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------
// Preview Section Component
// ---------------------
const PreviewSection = ({
  files,
  links,
  isUploading,
  processingStatus,
  processingPhases,
  formatFileSize,
  getProgressGradient,
  handleRemoveFile,
  handleRemoveLink,
  getFileIcon,
}) => (
  <Card className="bg-white shadow-lg border rounded-lg overflow-hidden transition mt-6">
    <CardContent className="p-6">
      <h2 className="text-xl font-medium text-gray-800 text-center mb-6">
        Your Study Materials
      </h2>
      {files.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg text-gray-800 mb-4 border-b pb-2">Files</h3>
          <div className="space-y-4">
            {files.map((file) => (
              <FilePreview
                key={file.id}
                file={file}
                isUploading={isUploading}
                processingStatus={processingStatus}
                processingPhases={processingPhases}
                formatFileSize={formatFileSize}
                getProgressGradient={getProgressGradient}
                handleRemoveFile={handleRemoveFile}
                getFileIcon={getFileIcon}
              />
            ))}
          </div>
        </div>
      )}
      {links.length > 0 && (
        <div>
          <h3 className="text-lg text-gray-800 mb-4 border-b pb-2">Links</h3>
          <div className="space-y-4">
            {links.map((link) => (
              <LinkPreview
                key={link.id}
                link={link}
                isUploading={isUploading}
                processingStatus={processingStatus}
                processingPhases={processingPhases}
                getProgressGradient={getProgressGradient}
                handleRemoveLink={handleRemoveLink}
              />
            ))}
          </div>
        </div>
      )}
    </CardContent>
  </Card>
);

// ---------------------
// Material Actions Component
// ---------------------
const MaterialActions = ({ material, sessionId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateQuizModal, setShowCreateQuizModal] = useState(false);
  const [quizParams, setQuizParams] = useState({
    numQuestions: 5,
    difficulty: "medium",
    questionType: "multiple-choice",
  });
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);
  const router = useRouter();

  // Function to handle downloading material content
  const handleDownload = () => {
    // If material has a direct link (like a PDF URL), use that for download
    if (material.link) {
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
    if (material.rawContent) {
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
    } else {
      alert("No downloadable content available for this material.");
    }
  };

  // Array of possible actions for a material
  const actions = [
    {
      icon: <Brain className="h-4 w-4" />,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      label: "Start Studying",
      onClick: () => router.push(`/materials/${material.id}`),
      disabled: material.status !== "Ready" && material.status !== "ready",
    },

    {
      icon: <Download className="h-4 w-4" />,
      color: "text-gray-600 no-loading",
      bgColor: "bg-gray-100",
      label: "Download",
      onClick: handleDownload,
      disabled: false,
    },
  ];

  return (
    <>
      <div className="mt-3 border-t pt-3">
        <div className="flex flex-wrap gap-2">
          {/* Display first 2 actions as buttons */}
          {actions.slice(0, 2).map((action, index) => (
            <Button
              key={index}
              size="sm"
              variant="outline"
              className={`transition-all px-2.5 py-1.5 h-auto flex items-center gap-1.5 text-xs ${
                action.color
              } border-gray-200 hover:bg-gray-50 ${
                action.disabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
              onClick={action.disabled ? undefined : action.onClick}
              disabled={action.disabled}
            >
              <span className={`${action.bgColor} p-1 rounded-full`}>
                {action.icon}
              </span>
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    </>
  );
};

// ---------------------
// Existing Materials Component
// ---------------------
const ExistingMaterialsSection = ({
  existingMaterials,
  isLoadingMaterials,
  loadError,
  processingStatus,
  getFileIcon,
  formatFileSize,
}) => {
  const router = useRouter();

  if (isLoadingMaterials) {
    return (
      <Card className="bg-white shadow-lg border rounded-lg overflow-hidden transition mt-6">
        <CardContent className="p-6 text-center">
          <Loader className="h-8 w-8 text-gray-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-700">Loading existing materials...</p>
        </CardContent>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card className="bg-white shadow-lg border rounded-lg overflow-hidden transition mt-6">
        <CardContent className="p-6 text-center">
          <div className="text-red-500 mb-2">Error loading materials</div>
          <p className="text-gray-700 text-sm">{loadError}</p>
        </CardContent>
      </Card>
    );
  }

  if (existingMaterials.length === 0) {
    return null;
  }

  // Function to determine icon based on material type or URL
  const getMaterialIcon = (material) => {
    if (!material.type || material.type === "unknown") {
      // Determine type from filename or URL if available
      if (
        material.name?.toLowerCase().endsWith(".pdf") ||
        material.url?.toLowerCase().includes(".pdf")
      ) {
        return <FileText className="h-8 w-8 text-gray-600" />;
      } else if (
        material.url?.includes("youtube.com") ||
        material.url?.includes("youtu.be")
      ) {
        return <Youtube className="h-8 w-8 text-red-600" />;
      } else if (material.url) {
        return <Link className="h-8 w-8 text-blue-600" />;
      }
    }

    return getFileIcon(material.type || "default");
  };

  // Function to get status badge color based on material status
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

  return (
    <Card className="bg-white shadow-lg border rounded-lg overflow-hidden transition mt-6">
      <CardContent className="p-6">
        <h2 className="text-xl font-medium text-gray-800 text-center mb-6">
          Existing Study Materials
        </h2>
        <div className="space-y-4">
          {existingMaterials.map((material) => {
            const status = processingStatus[material.id] || {
              progress:
                material.status === "ready" || material.status === "Ready"
                  ? 100
                  : 50,
              statusText: material.status || "Unknown",
            };

            const displayName =
              material.title ||
              (material.url
                ? new URL(material.url).pathname.split("/").pop()
                : "Unknown Material");

            return (
              <div
                key={material.id}
                className="p-4 border rounded transition hover:shadow-md cursor-pointer"
              >
                <div className="flex items-start">
                  <div className="mr-4">
                    <div className="p-2 rounded-full bg-gray-100">
                      {getMaterialIcon(material)}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-2">
                      <span
                        className="font-medium text-gray-800 truncate max-w-[250px]"
                        title={displayName}
                      >
                        {displayName}
                      </span>
                      <Badge
                        className={`text-xs ${getStatusBadgeColor(
                          material.status
                        )}`}
                      >
                        {material.status || "Unknown"}
                      </Badge>
                    </div>

                    {material.url && (
                      <p className="text-xs text-gray-600 truncate mb-2">
                        {material.url}
                      </p>
                    )}

                    {material.description && (
                      <p
                        className="text-sm text-gray-700 mb-2 line-clamp-2"
                        title={material.description}
                      >
                        {material.description}
                      </p>
                    )}

                    {status.progress < 100 &&
                      material.status !== "error" &&
                      material.status !== "unsupported" && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                            <span>{status.statusText || material.status}</span>
                            <span>{status.progress}%</span>
                          </div>
                          <Progress value={status.progress} className="h-2" />
                        </div>
                      )}

                    <div className="mt-3 flex justify-between items-center">
                      <div>
                        {material.createdAt && (
                          <div className="flex items-center text-xs text-gray-500 mb-1">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>
                              {new Date(material.createdAt).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>

                      <MaterialActions
                        material={material}
                        sessionId={material.sessionId}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// ---------------------
// Ingest Button Component
// ---------------------
const IngestButton = ({ files, links, isUploading, handleIngest }) => (
  <div className="flex justify-center mt-6">
    <Button
      size="lg"
      onClick={handleIngest}
      disabled={isUploading || (files.length === 0 && links.length === 0)}
      className="px-8 py-4 text-lg font-medium bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded hover:bg-gradient-to-r hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-70"
    >
      {isUploading ? (
        <div className="flex items-center">
          <Loader className="mr-3 h-5 w-5 animate-spin" />
          Processing...
        </div>
      ) : (
        "Ingest Materials"
      )}
    </Button>
  </div>
);

// ---------------------
// Main UploadMaterialsPage Component
// ---------------------
const UploadMaterialsPage = () => {
  const [files, setFiles] = useState([]);
  const [links, setLinks] = useState([]);
  const [currentLink, setCurrentLink] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState({});
  const [youtubeLoading, setYoutubeLoading] = useState(false);

  // New state variables for existing materials
  const [existingMaterials, setExistingMaterials] = useState([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // New state variable for session details
  const [sessionDetails, setSessionDetails] = useState(null);

  // Move the useParams hook call to the component level
  const params = useParams();
  const sessionId = params.sessionId;

  // Fetch existing materials and session details when component mounts
  useEffect(() => {
    const fetchSessionData = async () => {
      if (!sessionId) return;

      setIsLoadingMaterials(true);
      setLoadError(null);

      try {
        // Fetch session details and materials associated with this session
        const response = await fetch(
          `/api/study_session?sessionId=${sessionId}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch session data: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.session) {
          setSessionDetails(data.session);

          if (data.session.materials) {
            setExistingMaterials(data.session.materials);

            // Update processing status for existing materials
            const newProcessingStatus = { ...processingStatus };
            data.session.materials.forEach((material) => {
              if (material.status) {
                // Map statuses to progress values
                const statusMap = {
                  "Not Found": 50,
                  processing: 75,
                  "Converting to text": 80,
                  "Skimming Through": 85,
                  Summarizing: 95,
                  Ready: 100,
                  ready: 100,
                  error: 0,
                  unsupported: 0,
                };

                const progress = statusMap[material.status] || 50;
                const phase = progress === 100 ? 4 : Math.floor(progress / 25);

                newProcessingStatus[material.id] = {
                  progress,
                  statusText: material.status,
                  phase,
                  error:
                    material.status === "error" ? "Processing failed" : null,
                  type: "file", // Default type
                };
              }
            });

            setProcessingStatus(newProcessingStatus);
          }
        }
      } catch (error) {
        console.error("Error fetching session data:", error);
        setLoadError(error.message);
      } finally {
        setIsLoadingMaterials(false);
      }
    };

    fetchSessionData();
  }, [sessionId]);

  // Effect to monitor processing status and refresh existing materials when items become ready
  useEffect(() => {
    const readyMaterials = Object.entries(processingStatus).filter(
      ([id, status]) => status.statusText === "Ready" && status.progress === 100
    );

    if (readyMaterials.length > 0 && isUploading) {
      // Some materials have become ready, refresh the materials list
      const fetchUpdatedMaterials = async () => {
        try {
          const response = await fetch(
            `/api/study_session?sessionId=${sessionId}`
          );

          if (!response.ok) {
            throw new Error(
              `Failed to fetch updated materials: ${response.status}`
            );
          }

          const data = await response.json();

          if (data.success && data.session && data.session.materials) {
            setExistingMaterials(data.session.materials);

            // Remove processed files from the files state
            const readyMaterialIds = readyMaterials.map(([id]) => id);
            setFiles((prevFiles) =>
              prevFiles.filter((file) => !readyMaterialIds.includes(file.id))
            );
          }
        } catch (error) {
          console.error("Error refreshing materials after processing:", error);
        }
      };

      fetchUpdatedMaterials();
    }
  }, [processingStatus, isUploading, sessionId]);

  // Utility functions
  const getRandomBubbleColor = () => {
    // For file borders and badges
    const colors = ["#4B5563", "#6B7280", "#9CA3AF"];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
  };

  const getFileIcon = (type) => {
    const fileTypeIcons = {
      // PDF file types
      "application/pdf": <FileText className="h-8 w-8 text-gray-600" />,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        <FileText className="h-8 w-8 text-gray-600" />,

      // Audio file types
      "audio/mpeg": <FileAudio className="h-8 w-8 text-blue-600" />,
      "audio/mp3": <FileAudio className="h-8 w-8 text-blue-600" />,
      "audio/wav": <FileAudio className="h-8 w-8 text-blue-600" />,
      "audio/x-m4a": <FileAudio className="h-8 w-8 text-blue-600" />,
      "audio/m4a": <FileAudio className="h-8 w-8 text-blue-600" />,
      "audio/mp4": <FileAudio className="h-8 w-8 text-blue-600" />,
      "audio/x-wav": <FileAudio className="h-8 w-8 text-blue-600" />,

      // Video file types
      "video/mp4": <FileVideo className="h-8 w-8 text-gray-600" />,

      // Default file icon
      default: <File className="h-8 w-8 text-gray-600" />,
    };

    // Special handling for audio types that might not be explicitly listed
    if (type.startsWith("audio/")) {
      return <FileAudio className="h-8 w-8 text-blue-600" />;
    }

    return fileTypeIcons[type] || fileTypeIcons.default;
  };

  const getProgressGradient = (progress) => {
    // Using a simple gradient for progress bars
    const colors = ["#3B82F6", "#2563EB"];
    return `linear-gradient(to right, ${colors[0]}, ${colors[1]})`;
  };

  const processingPhases = {
    link: [
      "Validating link",
      "Downloading",
      "Processing",
      "Finalizing",
      "Complete",
    ],
    file: [
      "Checking file",
      "Uploading",
      "Processing",
      "Finalizing",
      "Complete",
    ],
    audio: [
      "Checking audio",
      "Uploading",
      "Transcribing",
      "Analyzing",
      "Complete",
    ],
  };

  // Handlers for file uploads
  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = droppedFiles.filter((file) => {
      // Check if file is PDF or audio
      const isPdf = file.type === "application/pdf";
      const isAudio = file.type.startsWith("audio/");

      if (!isPdf && !isAudio) {
        alert(
          `File ${file.name} is not supported. Only PDF and audio files (MP3, WAV, M4A) are currently supported.`
        );
        return false;
      }

      // Check file size (30MB = 30 * 1024 * 1024 bytes)
      if (file.size > 30 * 1024 * 1024) {
        alert(`File ${file.name} exceeds the 30MB size limit.`);
        return false;
      }

      return true;
    });
    const newFiles = validFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      type: file.type,
      size: file.size,
      title: file.name,
      subject: "",
      color: getRandomBubbleColor(),
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    // Filter for PDF and audio files under 30MB
    const validFiles = selectedFiles.filter((file) => {
      // Check if file is PDF or audio
      const isPdf = file.type === "application/pdf";
      const isAudio = file.type.startsWith("audio/");

      if (!isPdf && !isAudio) {
        alert(
          `File ${file.name} is not supported. Only PDF and audio files (MP3, WAV, M4A) are currently supported.`
        );
        return false;
      }

      // Check file size (30MB = 30 * 1024 * 1024 bytes)
      if (file.size > 30 * 1024 * 1024) {
        alert(`File ${file.name} exceeds the 30MB size limit.`);
        return false;
      }

      return true;
    });

    // For each file, simply store it in state along with an "uploaded" flag.
    const newFiles = validFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      type: file.type,
      size: file.size,
      title: file.name,
      subject: "",
      color: getRandomBubbleColor(),
      uploaded: false, // not uploaded yet
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleAddLink = async () => {
    // Disabled - do nothing
    return;
  };

  const handleRemoveFile = (id) =>
    setFiles((prev) => prev.filter((file) => file.id !== id));
  const handleRemoveLink = (id) =>
    setLinks((prev) => prev.filter((link) => link.id !== id));

  const handleIngest = async () => {
    setIsUploading(true);
    // Initialize processingStatus for each file (and links if needed)
    const initialStatus = {};
    files.forEach((file) => {
      // Check if this is an audio file and set the appropriate type
      const isAudio = file.type.startsWith("audio/");
      initialStatus[file.id] = {
        phase: 0,
        progress: 0,
        type: isAudio ? "audio" : "file",
        statusText: "",
      };
    });
    setProcessingStatus(initialStatus);

    if (!sessionId) {
      console.error("No session ID found in URL");
      // Show error in UI
      setProcessingStatus((prev) => {
        const newStatus = { ...prev };
        files.forEach((file) => {
          newStatus[file.id] = {
            ...newStatus[file.id],
            error: "No session ID found. Please check the URL.",
            statusText: "Error",
            phase: -1,
          };
        });
        return newStatus;
      });
      return;
    }

    console.log("Starting upload with session ID:", sessionId);

    // For each file that hasn't been uploaded, perform the Vercel Blob upload
    for (const fileObj of files) {
      if (!fileObj.uploaded) {
        try {
          const materialId = await uploadFile(
            fileObj.file,
            setProcessingStatus,
            sessionId
          );

          if (materialId) {
            // Update the file object in state with the new materialId and mark it as uploaded
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileObj.id
                  ? { ...f, id: materialId, uploaded: true }
                  : f
              )
            );
          }
        } catch (error) {
          console.error("Error during file upload:", error);
          setProcessingStatus((prev) => ({
            ...prev,
            [fileObj.id]: {
              ...prev[fileObj.id],
              error: `Upload failed: ${error.message || "Unknown error"}`,
              statusText: "Failed",
              phase: -1,
            },
          }));
        }
      }
    }
  };

  const simulateProcessing = (id, isFile) => {
    const itemType = isFile ? "file" : "link";
    const phases = processingPhases[itemType];
    let currentPhase = 0;
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 10;
      if (progress >= 100) {
        progress = 100;
        currentPhase++;
        progress = 0;
        if (currentPhase >= phases.length - 1) {
          clearInterval(interval);
          setProcessingStatus((prev) => ({
            ...prev,
            [id]: { phase: phases.length - 1, progress: 100, type: itemType },
          }));
        } else {
          setProcessingStatus((prev) => ({
            ...prev,
            [id]: { phase: currentPhase, progress, type: itemType },
          }));
        }
      } else {
        setProcessingStatus((prev) => ({
          ...prev,
          [id]: { phase: currentPhase, progress, type: itemType },
        }));
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col p-6 md:p-10">
      <div className="max-w-4xl w-full mx-auto">
        <Header />
        <SessionHeader
          sessionDetails={sessionDetails}
          isLoading={isLoadingMaterials}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FileUpload
            handleDrop={handleDrop}
            handleFileChange={handleFileChange}
            fileInputId="fileInput"
          />
          <Card className="bg-white shadow-lg border rounded-lg overflow-hidden">
            <CardContent className="p-6">
              <h2 className="text-xl font-medium text-gray-800 mb-4">
                Link Upload
              </h2>
              <div className="text-center p-6 bg-gray-50 rounded-lg border border-dashed">
                <Link className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-700">Link Upload Disabled</p>
                <p className="text-sm text-gray-500 mt-2">
                  This feature is temporarily unavailable. Please upload PDF
                  files only.
                </p>
              </div>
              <div className="mt-4 text-xs text-center text-gray-500">
                YouTube and web links will be supported in a future update.
              </div>
            </CardContent>
          </Card>
        </div>

        {(files.length > 0 || links.length > 0) && (
          <PreviewSection
            files={files}
            links={links}
            isUploading={isUploading}
            processingStatus={processingStatus}
            processingPhases={processingPhases}
            formatFileSize={formatFileSize}
            getProgressGradient={getProgressGradient}
            handleRemoveFile={handleRemoveFile}
            handleRemoveLink={handleRemoveLink}
            getFileIcon={getFileIcon}
          />
        )}

        {/* Moved Ingest button above Existing Materials section */}
        {(files.length > 0 || links.length > 0) && (
          <IngestButton
            files={files}
            links={links}
            isUploading={isUploading}
            handleIngest={handleIngest}
          />
        )}

        <ExistingMaterialsSection
          existingMaterials={existingMaterials}
          isLoadingMaterials={isLoadingMaterials}
          loadError={loadError}
          processingStatus={processingStatus}
          getFileIcon={getFileIcon}
          formatFileSize={formatFileSize}
        />

        {isUploading &&
          Object.values(processingStatus).every(
            (status) =>
              status.phase === processingPhases[status.type].length - 1 &&
              status.progress === 100
          ) && (
            <div className="mt-8 text-center">
              <CheckCircle className="mx-auto h-10 w-10 text-green-600" />
              <h3 className="text-xl font-medium text-gray-800 mt-2">
                Processing Complete
              </h3>
              <p className="text-gray-600">
                Your materials are ready for review.
              </p>
            </div>
          )}
      </div>
    </div>
  );
};

export default UploadMaterialsPage;
