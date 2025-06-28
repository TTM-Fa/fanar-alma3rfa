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
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";  
import {
  ArrowLeft,
  Brain,
  Loader,
  MessageCircle,
  CheckCircle,
} from "lucide-react";

const CreateChatPage = () => {
  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);  const [formData, setFormData] = useState({
    title: "",
    description: "",
    language: "en", // Default to English
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
          setMaterial({
            id: data.material_id,
            title: data.title,
            status: data.material_status,
            studySessionId: data.studySessionId,
          });
          
          // Set default title based on material
          setFormData(prev => ({
            ...prev,
            title: `Chat - ${data.title || 'Untitled Material'}`
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

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateChat = async () => {
    if (!formData.title.trim()) {
      setError("Please enter a title for your chat");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response = await fetch(`/api/chat/${materialId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          language: formData.language,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to the new chat
        router.push(`/chat/${materialId}/view/${data.chat.id}`);
      } else {
        throw new Error(data.error || "Failed to create chat");
      }
    } catch (error) {
      console.error("Error creating chat:", error);
      setError(error.message);
    } finally {
      setCreating(false);
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
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const isReady = material?.status === "Ready" || material?.status === "ready";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col p-6 md:p-10">
      <div className="max-w-4xl w-full mx-auto">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => router.push(`/chat/${materialId}/list`)}
          className="mb-6 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Chats
        </Button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100">
              <Brain className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Create New Chat
              </h1>
              <p className="text-gray-600">
                {material?.title || "Loading..."}
              </p>
            </div>
          </div>
          <p className="text-gray-600 max-w-2xl">
            Start a new conversation with your material. You can ask questions and get AI-powered answers based on the content.
          </p>
        </div>

        {/* Material status warning */}
        {!isReady && (
          <Card className="mb-8 border-amber-200 bg-amber-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <MessageCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-medium text-amber-800">Material Not Ready</h3>
                  <p className="text-sm text-amber-700">
                    Your material is still being processed. Please wait until processing is complete before creating a chat.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create chat form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageCircle className="h-5 w-5 mr-2 text-blue-600" />
              Chat Details
            </CardTitle>
            <CardDescription>
              Configure your new chat session
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Chat Title *</Label>
              <Input
                id="title"
                placeholder="Enter a title for your chat..."
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                disabled={!isReady}
              />
            </div>            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add a description for this chat session..."
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                rows={3}
                disabled={!isReady}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Chat Language *</Label>
              <Select
                value={formData.language}
                onValueChange={(value) => handleInputChange("language", value)}
                disabled={!isReady}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select chat language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">
                    <div className="flex items-center gap-2">
                      <span>🇺🇸</span>
                      <span>English</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="ar">
                    <div className="flex items-center gap-2">
                      <span>🇸🇦</span>
                      <span>العربية (Arabic)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                {formData.language === 'ar' 
                  ? 'The material content will be translated to Arabic and voice recognition will be set to Arabic.'
                  : 'Chat will be conducted in English with English voice recognition.'
                }
              </p>
            </div>

            {error && (
              <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleCreateChat}
                disabled={!isReady || creating || !formData.title.trim()}
                className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700"
              >
                {creating ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Creating Chat...
                  </>
                ) : (
                  <>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Create Chat
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/chat/${materialId}/list`)}
                disabled={creating}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h3 className="font-medium text-blue-800 mb-3 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              Tips for Better Conversations
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Ask specific questions about the material content</li>
              <li>• Request explanations of concepts or terms</li>
              <li>• Ask for summaries of specific sections</li>
              <li>• Request examples or practical applications</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateChatPage;
