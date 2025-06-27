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
import Link from "next/link";
import {
  ArrowLeft,
  Brain,
  Calendar,
  Clock,
  MessageCircle,
  Loader,
  PlusCircle,
  ChevronRight,
} from "lucide-react";

const ChatListPage = () => {
  const [material, setMaterial] = useState(null);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [materialLoading, setMaterialLoading] = useState(true);
  const [error, setError] = useState(null);
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
        } else {
          throw new Error(data.error || "Unknown error fetching material");
        }
      } catch (error) {
        console.error("Error fetching material:", error);
        setError(error.message);
      } finally {
        setMaterialLoading(false);
      }
    };

    fetchMaterialDetails();
  }, [materialId]);

  useEffect(() => {
    const fetchChats = async () => {
      if (!materialId) return;

      try {
        const response = await fetch(`/api/chat/${materialId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch chats: ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
          setChats(data.chats);
        } else {
          throw new Error(data.error || "Unknown error fetching chats");
        }
      } catch (error) {
        console.error("Error fetching chats:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (!materialLoading) {
      fetchChats();
    }
  }, [materialId, materialLoading]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (materialLoading) {
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
            Error Loading Chats
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col p-6 md:p-10">
      <div className="max-w-6xl w-full mx-auto">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => router.push(`/materials/${materialId}`)}
          className="mb-6 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Material
        </Button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100">
              <Brain className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Chat with Material
              </h1>
              <p className="text-gray-600">
                {material?.title || "Loading..."}
              </p>
            </div>
          </div>
          <p className="text-gray-600 max-w-2xl">
            Ask questions and get AI-powered answers based on your material content.
            Create multiple chat sessions to organize different topics or discussions.
          </p>
        </div>

        {/* Create new chat button */}
        <div className="mb-8">
          <Button
            onClick={() => router.push(`/chat/${materialId}/create`)}
            className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700"
            disabled={material?.status !== "Ready" && material?.status !== "ready"}
          >
            <PlusCircle className="mr-2 h-5 w-5" />
            Start New Chat
          </Button>
          {material?.status !== "Ready" && material?.status !== "ready" && (
            <p className="text-sm text-amber-600 mt-2">
              Chat feature will be available once the material is processed.
            </p>
          )}
        </div>

        {/* Chats list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader className="h-8 w-8 text-indigo-600 animate-spin" />
          </div>
        ) : chats.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-800 mb-2">
              No chats yet
            </h3>
            <p className="text-gray-600 mb-6">
              Start your first chat to begin asking questions about this material.
            </p>
            <Button
              onClick={() => router.push(`/chat/${materialId}/create`)}
              className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white"
              disabled={material?.status !== "Ready" && material?.status !== "ready"}
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              Start New Chat
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {chats.map((chat) => (
              <Card
                key={chat.id}
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => router.push(`/chat/${materialId}/view/${chat.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gray-800 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {chat.title}
                      </CardTitle>
                      {chat.description && (
                        <CardDescription className="mt-1 line-clamp-2">
                          {chat.description}
                        </CardDescription>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors ml-2 flex-shrink-0" />
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-4 w-4" />
                      <span>{chat.messageCount} messages</span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-0">
                  <div className="flex items-center justify-between w-full text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Created {formatDate(chat.createdAt)}</span>
                    </div>
                    {chat.updatedAt !== chat.createdAt && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Updated {formatDate(chat.updatedAt)}</span>
                      </div>
                    )}
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatListPage;
