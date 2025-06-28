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
    <div className="min-h-screen bg-gradient-to-b from-[#0a1833] to-[#1a2747] relative overflow-hidden py-12">
      {/* Navy blue background blobs */}
      <div className="absolute top-0 left-0 w-1/3 h-1/3 bg-[#223366] rounded-full filter blur-3xl opacity-30 transform -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-[#0a1833] rounded-full filter blur-3xl opacity-40 transform translate-x-1/4 translate-y-1/4"></div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Back button */}
        <Button
          variant="ghost"
          className="mb-6 flex items-center text-[#b3c6e0] hover:text-white"
          onClick={navigateHome}
        >
          <ChevronLeft className="mr-1 h-5 w-5" />
          Back to Home
        </Button>

        <Card className="bg-white backdrop-blur shadow-2xl rounded-xl overflow-hidden border border-[#223366]">
          <CardHeader className="bg-gradient-to-r from-[#1a2747] to-[#223366] text-white p-6 border-b border-[#223366]">
            <div className="flex items-center">
              <BookOpen className="h-6 w-6 mr-3 text-[#b3c6e0]" />
              <CardTitle className="text-2xl font-bold tracking-tight">
                Previous Study Sessions
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 text-[#223366] animate-spin" />
                <span className="ml-3 text-lg text-[#b3c6e0]">
                  Loading sessions...
                </span>
              </div>
            ) : error ? (
              <div className="bg-[#1a2747] text-[#ffb4b4] p-4 rounded-lg border border-[#ffb4b4] text-center">
                <p>{error}</p>
                <Button
                  variant="outline"
                  className="mt-3 border-[#ffb4b4] text-[#ffb4b4] hover:bg-[#1a2747]"
                  onClick={fetchSessions}
                >
                  Try Again
                </Button>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-16">
                <FolderOpen className="h-16 w-16 text-[#223366] mx-auto mb-4" />
                <h3 className="text-xl font-medium text-[#b3c6e0] mb-2">
                  No study sessions yet
                </h3>
                <p className="text-[#7a8ca7] mb-6">
                  Create your first study session to get started
                </p>
                <Button
                  className="bg-gradient-to-r from-[#223366] to-[#1a2747] hover:from-[#1a2747] hover:to-[#223366] text-white"
                  onClick={navigateHome}
                >
                  Create New Session
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse bg-white rounded-xl shadow-lg">
                  <thead>
                    <tr className="border-b border-[#223366]">
                      <th className="text-left py-4 px-4 font-semibold text-[#223366]">
                        Title
                      </th>
                      <th className="text-left py-4 px-4 font-semibold text-[#223366]">
                        Subject
                      </th>
                      <th className="text-left py-4 px-4 font-semibold text-[#223366]">
                        Materials
                      </th>
                      <th className="text-left py-4 px-4 font-semibold text-[#223366]">
                        Created
                      </th>
                      <th className="text-left py-4 px-4 font-semibold text-[#223366]">
                        Last Updated
                      </th>
                      <th className="text-right py-4 px-4 font-semibold text-[#223366]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => (
                      <tr
                        key={session.id}
                        className="border-b border-[#223366]/20 hover:bg-[#eaf0fa] transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="font-medium text-[#142042]">
                            {session.title}
                          </div>
                          {session.description && (
                            <div className="text-sm text-[#7a8ca7] truncate max-w-xs">
                              {session.description}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <Badge
                            className={`font-medium border-0 ${getSubjectColor(
                              session.subject
                            )}`}
                          >
                            {getSubjectLabel(session.subject)}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center">
                            <FolderOpen className="h-4 w-4 text-[#223366] mr-2" />
                            <span className="text-[#142042]">
                              {session.materialsCount}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center text-[#223366]">
                            <Calendar className="h-4 w-4 mr-2 text-[#7a8ca7]" />
                            <span>
                              {new Date(session.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center text-[#223366]">
                            <Clock className="h-4 w-4 mr-2 text-[#7a8ca7]" />
                            <span>
                              {new Date(session.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <Button
                            className="bg-gradient-to-r from-[#1e3c72] to-[#2a5298] hover:from-[#2a5298] hover:to-[#1e3c72] text-white shadow-md"

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
