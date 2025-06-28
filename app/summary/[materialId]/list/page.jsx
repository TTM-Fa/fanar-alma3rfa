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
  Sparkles,
  Calendar,
  Clock,
  FileText,
  Loader,
  PlusCircle,
  ChevronRight,
  BookOpen,
} from "lucide-react";

const SummaryListPage = () => {
  const [material, setMaterial] = useState(null);
  const [summaries, setSummaries] = useState([]);
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

    const fetchSummaries = async () => {
      if (!materialId) return;

      try {
        const response = await fetch(`/api/materials/${materialId}/summaries`);

        if (!response.ok) {
          throw new Error(`Failed to fetch summaries: ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
          setSummaries(data.summaries);
        } else {
          throw new Error(data.error || "Unknown error fetching summaries");
        }
      } catch (error) {
        console.error("Error fetching summaries:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMaterialDetails();
    fetchSummaries();
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

  if (loading || materialLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <Loader className="h-12 w-12 text-[#2563eb] animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-medium text-[#223366]">
            Loading summaries...
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
            Summaries for {material.title || "Material"}
          </h1>
          <p className="text-[#223366]">
            View all summaries created for this study material
          </p>
        </div>

        {/* Action buttons */}
        <div className="mb-8">
          <Button
            onClick={() => router.push(`/summary/${materialId}/create`)}
            className="bg-gradient-to-r from-[#7eb6ff] to-[#2563eb] text-white font-bold border border-[#7eb6ff] shadow-lg transition-transform duration-200 hover:-translate-y-1 hover:shadow-2xl hover:from-[#2563eb] hover:to-[#7eb6ff] focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Summary
          </Button>
        </div>

        {/* Summary list */}
        <div className="space-y-6">
          {summaries.length === 0 ? (
            <Card className="bg-[#eaf0fa] shadow-md border border-[#b3c6e0]">
              <CardContent className="p-6 text-center">
                <div className="flex flex-col items-center py-8">
                  <div className="bg-[#b3c6e0] p-3 rounded-full mb-4">
                    <Sparkles className="h-8 w-8 text-[#2563eb]" />
                  </div>
                  <h3 className="text-xl font-medium text-[#223366] mb-2">
                    No Summaries Created Yet
                  </h3>
                  <p className="text-[#223366] mb-6 max-w-md">
                    Create your first summary to help understand the key
                    concepts from this material!
                  </p>
                  <Button
                    onClick={() => router.push(`/summary/${materialId}/create`)}
                    className="bg-gradient-to-r from-[#7eb6ff] to-[#2563eb] text-white font-bold border border-[#7eb6ff] shadow-lg transition-transform duration-200 hover:-translate-y-1 hover:shadow-2xl hover:from-[#2563eb] hover:to-[#7eb6ff] focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create First Summary
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            summaries.map((summary) => (
              <Card
                key={summary.id}
                className="transition-all hover:shadow-xl cursor-pointer bg-white border border-[#b3c6e0]"
                onClick={() =>
                  router.push(
                    `/summary/${materialId}/view/?summaryId=${summary.id}`
                  )
                }
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-[#eaf0fa] rounded-full border border-[#b3c6e0]">
                        <BookOpen className="h-6 w-6 text-[#2563eb]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[#223366]">
                          {summary.title || "Untitled Summary"}
                        </h3>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1 border-[#b3c6e0] text-[#223366]"
                          >
                            <Calendar className="h-3 w-3" />
                            Created {new Date(summary.createdAt).toLocaleDateString()}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1 border-[#b3c6e0] text-[#223366]"
                          >
                            <FileText className="h-3 w-3" />
                            Study Notes
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-[#223366] hidden md:block">
                        <div className="flex items-center">
                          <Clock className="h-3.5 w-3.5 mr-1" />
                          Created {formatDate(summary.createdAt)}
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

export default SummaryListPage;
