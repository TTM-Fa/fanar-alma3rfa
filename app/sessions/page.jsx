"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "nextjs-toploader/app";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Calendar,
  Clock,
  ArrowRight,
  Loader2,
} from "lucide-react";

function formatDate(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function getSubjectColor(subject) {
  const subjectColors = {
    math: "bg-blue-100 text-blue-800",
    science: "bg-green-100 text-green-800",
    literature: "bg-yellow-100 text-yellow-800",
    history: "bg-orange-100 text-orange-800",
    language: "bg-pink-100 text-pink-800",
    arts: "bg-purple-100 text-purple-800",
    "computer-science": "bg-indigo-100 text-indigo-800",
    other: "bg-gray-100 text-gray-800",
  };

  return subjectColors[subject] || subjectColors.other;
}

function getSubjectLabel(subject) {
  const subjectLabels = {
    math: "Mathematics",
    science: "Science",
    literature: "Literature",
    history: "History",
    language: "Languages",
    arts: "Arts",
    "computer-science": "Computer Science",
    other: "Other",
  };

  return subjectLabels[subject] || "Other";
}

const PreviousSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/study_session");
      const data = await response.json();

      if (data.success) {
        setSessions(data.data);
      } else {
        setError(data.error || "Failed to fetch sessions");
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const navigateToSession = (sessionId) => {
    // For now, navigate to the upload materials page, but eventually this should go to a session dashboard
    router.push(`/upload_materials/${sessionId}`);
  };

  const navigateHome = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-purple-50 relative overflow-hidden py-12">
      {/* Background gradient blobs */}
      <div className="absolute top-0 left-0 w-1/3 h-1/3 bg-purple-200 rounded-full filter blur-3xl opacity-30 transform -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-blue-200 rounded-full filter blur-3xl opacity-30 transform translate-x-1/4 translate-y-1/4"></div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Back button */}
        <Button
          variant="ghost"
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900"
          onClick={navigateHome}
        >
          <ChevronLeft className="mr-1 h-5 w-5" />
          Back to Home
        </Button>

        <Card className="bg-white/90 backdrop-blur shadow-xl rounded-xl overflow-hidden border-0">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6">
            <div className="flex items-center">
              <BookOpen className="h-6 w-6 mr-3" />
              <CardTitle className="text-2xl font-bold">
                Previous Study Sessions
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                <span className="ml-3 text-lg text-gray-600">
                  Loading sessions...
                </span>
              </div>
            ) : error ? (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 text-center">
                <p>{error}</p>
                <Button
                  variant="outline"
                  className="mt-3 border-red-300 text-red-600 hover:bg-red-50"
                  onClick={fetchSessions}
                >
                  Try Again
                </Button>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-16">
                <FolderOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-500 mb-2">
                  No study sessions yet
                </h3>
                <p className="text-gray-400 mb-6">
                  Create your first study session to get started
                </p>
                <Button
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
                  onClick={navigateHome}
                >
                  Create New Session
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-4 px-4 font-semibold text-gray-600">
                        Title
                      </th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-600">
                        Subject
                      </th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-600">
                        Materials
                      </th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-600">
                        Created
                      </th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-600">
                        Last Updated
                      </th>
                      <th className="text-right py-4 px-4 font-semibold text-gray-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => (
                      <tr
                        key={session.id}
                        className="border-b border-gray-100 hover:bg-indigo-50/30 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="font-medium text-gray-900">
                            {session.title}
                          </div>
                          {session.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {session.description}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <Badge
                            className={`font-medium ${getSubjectColor(
                              session.subject
                            )}`}
                          >
                            {getSubjectLabel(session.subject)}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center">
                            <FolderOpen className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-gray-700">
                              {session.materialsCount}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center text-gray-600">
                            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                            <span>
                              {new Date(session.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center text-gray-600">
                            <Clock className="h-4 w-4 mr-2 text-gray-400" />
                            <span>
                              {new Date(session.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <Button
                            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
                            onClick={() => navigateToSession(session.id)}
                          >
                            Continue
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PreviousSessions;
