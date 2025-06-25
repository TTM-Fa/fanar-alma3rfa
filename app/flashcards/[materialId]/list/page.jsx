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
  Clipboard,
  Calendar,
  Clock,
  FileText,
  Loader,
  PlusCircle,
  ChevronRight,
} from "lucide-react";

const FlashcardListPage = () => {
  const [material, setMaterial] = useState(null);
  const [decks, setDecks] = useState([]);
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

    const fetchFlashcardDecks = async () => {
      if (!materialId) return;

      try {
        const response = await fetch(`/api/material/${materialId}/flashcards`);

        if (!response.ok) {
          throw new Error(
            `Failed to fetch flashcard decks: ${response.status}`
          );
        }

        const data = await response.json();
        if (data.success) {
          setDecks(data.decks);
        } else {
          throw new Error(
            data.error || "Unknown error fetching flashcard decks"
          );
        }
      } catch (error) {
        console.error("Error fetching flashcard decks:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMaterialDetails();
    fetchFlashcardDecks();
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <Loader className="h-12 w-12 text-amber-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-800">
            Loading flashcards...
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
            Error Loading Data
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button
            onClick={() => router.back()}
            className="bg-gradient-to-r from-amber-600 to-orange-600 text-white"
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
            className="bg-gradient-to-r from-amber-600 to-orange-600 text-white"
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
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Flashcards for {material.title || "Material"}
          </h1>
          <p className="text-gray-600">
            View all flashcard decks created for this study material
          </p>
        </div>

        {/* Action buttons */}
        <div className="mb-8">
          <Button
            onClick={() => router.push(`/flashcards/${materialId}/create`)}
            className="bg-gradient-to-r from-amber-600 to-orange-600 text-white"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Flashcard Deck
          </Button>
        </div>

        {/* Flashcard list */}
        <div className="space-y-6">
          {decks.length === 0 ? (
            <Card className="bg-white shadow-md">
              <CardContent className="p-6 text-center">
                <div className="flex flex-col items-center py-8">
                  <div className="bg-amber-100 p-3 rounded-full mb-4">
                    <Clipboard className="h-8 w-8 text-amber-600" />
                  </div>
                  <h3 className="text-xl font-medium text-gray-800 mb-2">
                    No Flashcard Decks Created Yet
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md">
                    Create your first flashcard deck to help memorize key
                    concepts from this material!
                  </p>
                  <Button
                    onClick={() =>
                      router.push(`/flashcards/${materialId}/create`)
                    }
                    className="bg-gradient-to-r from-amber-600 to-orange-600 text-white"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create First Flashcard Deck
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            decks.map((deck) => (
              <Card
                key={deck.id}
                className="transition-all hover:shadow-lg cursor-pointer bg-white"
                onClick={() =>
                  router.push(
                    `/flashcards/${materialId}/view/?deckId=${deck.id}`
                  )
                }
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-amber-100 rounded-full">
                        <Clipboard className="h-6 w-6 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">
                          {deck.title || "Untitled Deck"}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {deck.description || "No description provided"}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1"
                          >
                            <Calendar className="h-3 w-3" />
                            Created{" "}
                            {new Date(deck.createdAt).toLocaleDateString()}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1"
                          >
                            <FileText className="h-3 w-3" />
                            {deck._count.flashcards || 0} cards
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-gray-600 hidden md:block">
                        <div className="flex items-center">
                          <Clock className="h-3.5 w-3.5 mr-1" />
                          Created {formatDate(deck.createdAt)}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
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

export default FlashcardListPage;
