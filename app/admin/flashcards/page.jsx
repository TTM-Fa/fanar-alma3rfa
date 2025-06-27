"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader,
  Search,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Calendar,
  Hash,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

const FlashcardAdmin = () => {
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [showImages, setShowImages] = useState(false);
  const [stats, setStats] = useState(null);

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchFlashcards();
    fetchStats();
  }, [page, search]);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/flashcards/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchFlashcards = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        search: search,
        includeImages: showImages.toString(),
      });

      const response = await fetch(`/api/admin/flashcards?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch flashcards");
      }

      const data = await response.json();
      setFlashcards(data.flashcards);
      setTotalPages(Math.ceil(data.total / ITEMS_PER_PAGE));
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchFlashcards();
  };

  if (loading && flashcards.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading flashcards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Flashcards Admin
          </h1>
          <p className="text-gray-600">
            View and manage flashcards (Prisma Studio alternative)
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Hash className="h-5 w-5 text-blue-600 mr-2" />
                  <div>
                    <p className="text-sm text-gray-600">Total Flashcards</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <ImageIcon className="h-5 w-5 text-green-600 mr-2" />
                  <div>
                    <p className="text-sm text-gray-600">With Images</p>
                    <p className="text-2xl font-bold">{stats.withImages}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-purple-600 mr-2" />
                  <div>
                    <p className="text-sm text-gray-600">Decks</p>
                    <p className="text-2xl font-bold">{stats.decks}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="h-5 w-5 bg-orange-600 rounded mr-2" />
                  <div>
                    <p className="text-sm text-gray-600">Avg per Deck</p>
                    <p className="text-2xl font-bold">
                      {Math.round(stats.total / Math.max(stats.decks, 1))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <form onSubmit={handleSearch} className="flex-1">
                <Label htmlFor="search">Search Flashcards</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="search"
                    type="text"
                    placeholder="Search by question or answer..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </form>

              <div className="flex items-center gap-2">
                <Button
                  variant={showImages ? "default" : "outline"}
                  onClick={() => {
                    setShowImages(!showImages);
                    setPage(1);
                  }}
                  className="flex items-center gap-2"
                >
                  {showImages ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {showImages ? "Hide Images" : "Show Images"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Card className="mb-6 border-red-200">
            <CardContent className="p-4">
              <p className="text-red-600">Error: {error}</p>
            </CardContent>
          </Card>
        )}

        {/* Flashcards */}
        <div className="space-y-4 mb-6">
          {flashcards.map((flashcard) => (
            <Card key={flashcard.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {flashcard.front}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{flashcard.deck.title}</Badge>                      {flashcard.imageUrl && (
                        <Badge variant="secondary">
                          <ImageIcon className="h-3 w-3 mr-1" />
                          Has Image
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    ID: {flashcard.id.slice(-8)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Answer:
                    </Label>
                    <p className="mt-1 text-gray-900">{flashcard.back}</p>
                  </div>                  {showImages && flashcard.imageUrl && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Image:
                      </Label>
                      <div className="mt-2">
                        <img
                          src={flashcard.imageUrl}
                          alt="Flashcard image"
                          className="max-w-md max-h-48 rounded-lg border"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>Deck: {flashcard.deck.title}</span>
                    <span>Created: {new Date(flashcard.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default FlashcardAdmin;
