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
import Link from "next/link";
import {
  ArrowLeft,
  Brain,
  Calendar,
  Clock,
  FileText,
  Loader,
  PlusCircle,
  CircleCheck,
  CircleHelp,
  Circle,
  ChevronRight,
  Trophy,
  BarChart,
  Timer,
  ListChecks,
} from "lucide-react";

const BLUE_BG = "#eaf0fa";
const NAVY = "#223366";
const BLUE = "#2563eb";
const LIGHT_BLUE = "#7eb6ff";

const QuizListPage = () => {
  const [material, setMaterial] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
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
            fileName: data.fileName,
            type: data.type,
            link: data.link,
            status: data.material_status,
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

    const fetchQuizzes = async () => {
      if (!materialId) return;

      try {
        const response = await fetch(`/api/materials/${materialId}/quizzes`);

        if (!response.ok) {
          throw new Error(`Failed to fetch quizzes: ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
          setQuizzes(data.quizzes);
        } else {
          throw new Error(data.error || "Unknown error fetching quizzes");
        }
      } catch (error) {
        console.error("Error fetching quizzes:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMaterialDetails();
    fetchQuizzes();
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

  const getDifficultyBadgeColor = (difficulty) => {
    const difficultyColors = {
      easy: `bg-[#dbeafe] text-[#2563eb] border border-[#b3c6e0]`,
      medium: `bg-[#e0e7ff] text-[#223366] border border-[#b3c6e0]`,
      hard: `bg-[#c7d2fe] text-[#142042] border border-[#b3c6e0]`,
    };
    return difficultyColors[difficulty] || `bg-[#eaf0fa] text-[#223366] border border-[#b3c6e0]`;
  };

  const getQuestionTypeIcon = (type) => {
    switch (type) {
      case "multiple-choice":
        return <ListChecks className="h-4 w-4" />;
      case "true-false":
        return <CircleCheck className="h-4 w-4" />;
      case "short-answer":
        return <FileText className="h-4 w-4" />;
      default:
        return <CircleHelp className="h-4 w-4" />;
    }
  };

  if (loading || materialLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <Loader className="h-12 w-12 text-[#2563eb] animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-medium text-[#223366]">
            Loading quizzes...
          </h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="text-[#2563eb] text-5xl mb-4">!</div>
          <h2 className="text-xl font-medium text-[#223366] mb-2">
            Error Loading Data
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

  if (!material) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="text-[#fbbf24] text-5xl mb-4">?</div>
          <h2 className="text-xl font-medium text-[#223366] mb-2">
            Material Not Found
          </h2>
          <p className="text-[#223366] mb-6">
            The requested material could not be found or may have been deleted.
          </p>
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

  return (
    <div className="min-h-screen bg-white flex flex-col p-6 md:p-10">
      <div className="max-w-6xl w-full mx-auto">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => router.push(`/materials/${materialId}`)}
          className="mb-6 text-[#223366] hover:text-[#142042] hover:bg-[#eaf0fa]"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Material
        </Button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#223366] mb-2">
            Quizzes for {material.title || "Material"}
          </h1>
          <p className="text-[#223366]">
            View all quizzes created for this study material
          </p>
        </div>

        {/* Action buttons */}
        <div className="mb-8">
          <Button
            onClick={() => router.push(`/quiz/${materialId}/create`)}
            className="bg-gradient-to-r from-[#7eb6ff] to-[#2563eb] text-white font-bold border border-[#7eb6ff] shadow-lg transition-transform duration-200 hover:-translate-y-1 hover:shadow-2xl hover:from-[#2563eb] hover:to-[#7eb6ff] focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Quiz
          </Button>
        </div>

        {/* Quiz list */}
        <div className="space-y-6">
          {quizzes.length === 0 ? (
            <Card className="bg-[#eaf0fa] shadow-md border border-[#b3c6e0]">
              <CardContent className="p-6 text-center">
                <div className="flex flex-col items-center py-8">
                  <div className="bg-[#b3c6e0] p-3 rounded-full mb-4">
                    <Brain className="h-8 w-8 text-[#2563eb]" />
                  </div>
                  <h3 className="text-xl font-medium text-[#223366] mb-2">
                    No Quizzes Created Yet
                  </h3>
                  <p className="text-[#223366] mb-6 max-w-md">
                    Create your first quiz to test your knowledge of this
                    material!
                  </p>
                  <Button
                    onClick={() => router.push(`/quiz/${materialId}/create`)}
                    className="bg-gradient-to-r from-[#7eb6ff] to-[#2563eb] text-white font-bold border border-[#7eb6ff] shadow-lg transition-transform duration-200 hover:-translate-y-1 hover:shadow-2xl hover:from-[#2563eb] hover:to-[#7eb6ff] focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create First Quiz
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            quizzes.map((quiz) => (
              <Card
                key={quiz.id}
                className="transition-all hover:shadow-xl cursor-pointer bg-white border border-[#b3c6e0]"
                onClick={() =>
                  router.push(`/quiz/${materialId}/view/?quizId=${quiz.id}`)
                }
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-[#eaf0fa] rounded-full border border-[#b3c6e0]">
                        <Brain className="h-6 w-6 text-[#2563eb]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[#223366]">
                          {quiz.title || "Untitled Quiz"}
                        </h3>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge
                            className={getDifficultyBadgeColor(quiz.difficulty)}
                          >
                            {quiz.difficulty?.charAt(0).toUpperCase() +
                              quiz.difficulty?.slice(1) || "Medium"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1 border-[#b3c6e0] text-[#223366]"
                          >
                            {getQuestionTypeIcon(quiz.questionType)}
                            {quiz.questionType === "multiple-choice"
                              ? "Multiple Choice"
                              : quiz.questionType === "true-false"
                              ? "True/False"
                              : quiz.questionType === "short-answer"
                              ? "Short Answer"
                              : "Mixed"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1 border-[#b3c6e0] text-[#223366]"
                          >
                            <ListChecks className="h-3 w-3" />
                            {quiz._count.questions || 0} questions
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-[#223366] hidden md:block">
                        <div className="flex items-center">
                          <Clock className="h-3.5 w-3.5 mr-1" />
                          Created {formatDate(quiz.createdAt)}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-[#2563eb] hover:bg-[#eaf0fa]"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizListPage;
