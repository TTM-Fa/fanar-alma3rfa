"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { NotificationPopup } from "@/components/ui/notification-popup";
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
  AlertTriangle,
} from "lucide-react";
import { upload } from "@vercel/blob/client";

// Upload file (PDF or audio) using Vercel Blob - simplified for new unified polling
async function uploadFile(file, setProcessingStatus, sessionId) {
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
        setProcessingStatus((prev) => ({
          ...prev,
          [tempMaterialId]: {
            ...prev[tempMaterialId],
            progress: Math.round(progress * 50),
            statusText: "Uploading",
            phase: 0,
          },
        }));
      },
    });

    console.log("Upload complete, blob response:", blob);

    // Handle materialId extraction (same logic as before)
    let materialId = blob.materialId;

    if (!materialId) {
      const blobUrl = blob.url;
      const fileName = blob.pathname || blobUrl.split("/").pop();
      await new Promise((resolve) => setTimeout(resolve, 1000));

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
          materialId = materialData.materialId;
          console.log("Retrieved material ID:", materialData.materialId);
        } else {
          throw new Error("Material ID not returned from server");
        }
      } catch (idError) {
        console.error("Error getting material ID:", idError);
        throw new Error(`Failed to get material ID: ${idError.message}`);
      }
    }

    if (!materialId) {
      throw new Error("Failed to get material ID from server response.");
    }

    // Update the processing status with the new permanent ID
    if (materialId !== tempMaterialId) {
      setProcessingStatus((prev) => {
        const newStatus = { ...prev };
        newStatus[materialId] = {
          ...newStatus[tempMaterialId],
          progress: 50,
          statusText: isAudio ? "Transcribing audio" : "Processing",
          phase: 1,
        };
        delete newStatus[tempMaterialId];
        return newStatus;
      });
    }

    return materialId;
  } catch (error) {
    console.error("Error uploading file:", error);
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
const MaterialActions = ({ material, sessionId, onDelete }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  // Function to handle downloading material content
  const handleDownload = () => {
    if (material.link) {
      const a = document.createElement("a");
      a.href = material.link;
      a.download = material.fileName || material.title || "download";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    if (material.rawContent) {
      const filename = `${material.title
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase()}.txt`;
      const blob = new Blob([material.rawContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      alert("No downloadable content available for this material.");
    }
  };

  // Function to handle material deletion
  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this material? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/materials/${material.id}/delete`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Failed to delete material: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        onDelete(material.id);
      } else {
        throw new Error(data.error || "Failed to delete material");
      }
    } catch (error) {
      console.error("Error deleting material:", error);
      alert(`Error deleting material: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const isReady = material.status === "Ready" || material.status === "ready";
  const hasError = ["Error", "error", "unsupported"].includes(material.status);

  // Define actions based on material status
  const actions = [];

  // Only show study and download buttons for ready materials
  if (isReady) {
    actions.push(
      {
        icon: <Brain className="h-4 w-4" />,
        color: "text-purple-600",
        bgColor: "bg-purple-100",
        label: "Start Studying",
        onClick: () => router.push(`/materials/${material.id}`),
        disabled: false,
      },
      {
        icon: <Download className="h-4 w-4" />,
        color: "text-gray-600 no-loading",
        bgColor: "bg-gray-100",
        label: "Download",
        onClick: handleDownload,
        disabled: false,
      }
    );
  }

  // Show delete button for errored materials
  if (hasError) {
    actions.push({
      icon: <Trash2 className="h-4 w-4" />,
      color: "text-red-600",
      bgColor: "bg-red-100",
      label: "Delete",
      onClick: handleDelete,
      disabled: isDeleting,
    });
  }

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 border-t pt-3">
      <div className="flex flex-wrap gap-2">
        {actions.map((action, index) => (
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
  onDeleteMaterial,
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
      Ready: "bg-green-100 text-green-800",
      ready: "bg-green-100 text-green-800",
      Processing: "bg-blue-100 text-blue-800",
      processing: "bg-blue-100 text-blue-800",
      "Converting to text": "bg-blue-100 text-blue-800",
      "Batch Created": "bg-purple-100 text-purple-800",
      "Skimming Through": "bg-blue-100 text-blue-800",
      Summarizing: "bg-blue-100 text-blue-800",
      Error: "bg-red-100 text-red-800",
      error: "bg-red-100 text-red-800",
      unsupported: "bg-orange-100 text-orange-800",
      uploading: "bg-gray-100 text-gray-800",
      uploaded: "bg-yellow-100 text-yellow-800",
      pending: "bg-yellow-100 text-yellow-800",
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
              progress: material.progress || 50,
              statusText: material.status || "Unknown",
            };

            const displayName =
              material.title ||
              (material.url
                ? new URL(material.url).pathname.split("/").pop()
                : "Unknown Material");

            const hasError = ["Error", "error", "unsupported"].includes(
              material.status
            );
            const isReady = ["Ready", "ready"].includes(material.status);
            const isProcessing =
              material.isProcessing || (material.progress < 100 && !hasError);

            return (
              <div
                key={material.id}
                className={`p-4 border rounded transition hover:shadow-md ${
                  hasError ? "border-red-200 bg-red-50" : "border-gray-200"
                }`}
              >
                <div className="flex items-start">
                  <div className="mr-4">
                    <div
                      className={`p-2 rounded-full ${
                        hasError ? "bg-red-100" : "bg-gray-100"
                      }`}
                    >
                      {hasError ? (
                        <AlertTriangle className="h-8 w-8 text-red-600" />
                      ) : (
                        getMaterialIcon(material)
                      )}
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

                    {hasError && (
                      <div className="text-red-600 text-sm mb-2">
                        <AlertTriangle className="h-4 w-4 inline mr-1" />
                        Processing failed. This material cannot be used for
                        studying.
                      </div>
                    )}

                    {isProcessing && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                          <span>{status.statusText || material.status}</span>
                          <span>{material.progress || status.progress}%</span>
                        </div>
                        <Progress
                          value={material.progress || status.progress}
                          className="h-2"
                        />
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
                        onDelete={onDeleteMaterial}
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

  // Session details state
  const [sessionDetails, setSessionDetails] = useState(null);

  // Notification popup state
  const [notification, setNotification] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
  });

  // Processing timeout state
  const [longRunningProcesses, setLongRunningProcesses] = useState(new Set());

  const params = useParams();
  const sessionId = params.sessionId;

  // Unified function to fetch session status using the new API
  const fetchSessionStatus = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(
        `/api/materials/session-status?sessionId=${sessionId}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch session status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.materials) {
        setExistingMaterials(data.materials);

        // Update processing status for existing materials
        const newProcessingStatus = { ...processingStatus };
        data.materials.forEach((material) => {
          if (material.status) {
            newProcessingStatus[material.id] = {
              progress: material.progress,
              statusText: material.status,
              phase: material.phase,
              error: material.hasError ? "Processing failed" : null,
              type: "file",
            };
          }
        });

        setProcessingStatus(newProcessingStatus);

        // Show notification if materials are taking too long to process
        const processingMaterials = data.materials.filter(
          (m) => m.isProcessing
        );

        if (processingMaterials.length > 0) {
          const longRunning = processingMaterials.filter((m) => {
            const createdTime = new Date(m.createdAt).getTime();
            const currentTime = new Date().getTime();
            const minutesProcessing = (currentTime - createdTime) / (1000 * 60);
            return minutesProcessing > 2; // Consider as long-running after 2 minutes
          });

          if (longRunning.length > 0 && !longRunningProcesses.has(sessionId)) {
            setLongRunningProcesses((prev) => new Set([...prev, sessionId]));
            setNotification({
              isOpen: true,
              type: "processing",
              title: "Materials Still Processing",
              message: (
                <div>
                  <p className="mb-2">
                    Your materials are being processed in the background. This
                    may take several minutes.
                  </p>
                  <p className="text-sm">
                    <strong>Processing:</strong> {processingMaterials.length}{" "}
                    material(s)
                  </p>
                  <p className="text-sm mt-2">
                    You can safely close this page and return later. The
                    materials will appear here once ready.
                  </p>
                </div>
              ),
            });
          }
        }
      }
    } catch (error) {
      console.error("Error fetching session status:", error);
      setLoadError(error.message);
    }
  };

  // Fetch session details (keeping existing session API for session info)
  const fetchSessionDetails = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/study_session?sessionId=${sessionId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch session details: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.session) {
        setSessionDetails(data.session);
      }
    } catch (error) {
      console.error("Error fetching session details:", error);
    }
  };

  // Initial data fetch when component mounts
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoadingMaterials(true);
      setLoadError(null);

      try {
        await Promise.all([fetchSessionStatus(), fetchSessionDetails()]);
      } catch (error) {
        console.error("Error fetching initial data:", error);
        setLoadError(error.message);
      } finally {
        setIsLoadingMaterials(false);
      }
    };

    fetchInitialData();
  }, [sessionId]);

  // Polling effect for status updates (reduced frequency since we have unified API)
  useEffect(() => {
    if (!sessionId) return;

    // Check if there are any materials currently being processed
    const hasProcessingMaterials = existingMaterials.some(
      (material) => material.isProcessing
    );

    if (!hasProcessingMaterials) return;

    console.log("Starting status polling for session:", sessionId);

    const pollInterval = setInterval(() => {
      fetchSessionStatus();
    }, 10000); // Poll every 10 seconds

    return () => {
      console.log("Stopping status polling");
      clearInterval(pollInterval);
    };
  }, [sessionId, existingMaterials]);

  // Handle material deletion
  const handleDeleteMaterial = (materialId) => {
    setExistingMaterials((prev) =>
      prev.filter((material) => material.id !== materialId)
    );
    setProcessingStatus((prev) => {
      const newStatus = { ...prev };
      delete newStatus[materialId];
      return newStatus;
    });
  };

  // Close notification
  const closeNotification = () => {
    setNotification((prev) => ({ ...prev, isOpen: false }));
  };

  // Utility functions (keeping existing ones)
  const getRandomBubbleColor = () => {
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
      "application/pdf": <FileText className="h-8 w-8 text-gray-600" />,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        <FileText className="h-8 w-8 text-gray-600" />,
      "audio/mpeg": <FileAudio className="h-8 w-8 text-blue-600" />,
      "audio/mp3": <FileAudio className="h-8 w-8 text-blue-600" />,
      "audio/wav": <FileAudio className="h-8 w-8 text-blue-600" />,
      "audio/x-m4a": <FileAudio className="h-8 w-8 text-blue-600" />,
      "audio/m4a": <FileAudio className="h-8 w-8 text-blue-600" />,
      "audio/mp4": <FileAudio className="h-8 w-8 text-blue-600" />,
      "audio/x-wav": <FileAudio className="h-8 w-8 text-blue-600" />,
      "video/mp4": <FileVideo className="h-8 w-8 text-gray-600" />,
      default: <File className="h-8 w-8 text-gray-600" />,
    };

    if (type.startsWith("audio/")) {
      return <FileAudio className="h-8 w-8 text-blue-600" />;
    }

    return fileTypeIcons[type] || fileTypeIcons.default;
  };

  const getProgressGradient = (progress) => {
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

  // File handling functions (keeping existing logic)
  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = droppedFiles.filter((file) => {
      const isPdf = file.type === "application/pdf";
      const isAudio = file.type.startsWith("audio/");

      if (!isPdf && !isAudio) {
        alert(
          `File ${file.name} is not supported. Only PDF and audio files (MP3, WAV, M4A) are currently supported.`
        );
        return false;
      }

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
    const validFiles = selectedFiles.filter((file) => {
      const isPdf = file.type === "application/pdf";
      const isAudio = file.type.startsWith("audio/");

      if (!isPdf && !isAudio) {
        alert(
          `File ${file.name} is not supported. Only PDF and audio files (MP3, WAV, M4A) are currently supported.`
        );
        return false;
      }

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
      uploaded: false,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleAddLink = async () => {
    return; // Disabled
  };

  const handleRemoveFile = (id) =>
    setFiles((prev) => prev.filter((file) => file.id !== id));
  const handleRemoveLink = (id) =>
    setLinks((prev) => prev.filter((link) => link.id !== id));

  const handleIngest = async () => {
    setIsUploading(true);

    // Initialize processing status for each file
    const initialStatus = {};
    files.forEach((file) => {
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

    // Upload files
    for (const fileObj of files) {
      if (!fileObj.uploaded) {
        try {
          const materialId = await uploadFile(
            fileObj.file,
            setProcessingStatus,
            sessionId
          );

          if (materialId) {
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

    // Refresh session status after uploading
    setTimeout(() => {
      fetchSessionStatus();
    }, 2000);
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
          onDeleteMaterial={handleDeleteMaterial}
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

      {/* Notification Popup */}
      <NotificationPopup
        isOpen={notification.isOpen}
        onClose={closeNotification}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        action={
          notification.type === "processing" ? (
            <Button
              onClick={closeNotification}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              Got it
            </Button>
          ) : null
        }
      />
     
    </div>
  );
};

export default UploadMaterialsPage;
