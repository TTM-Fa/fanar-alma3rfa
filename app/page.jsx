"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useRouter } from "nextjs-toploader/app";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  BookOpen,
  Activity,
  ChevronRight,
  Plus,
  History,
  Brain,
  X,
} from "lucide-react";

const LandingPage = () => {
  const [isHoveringNew, setIsHoveringNew] = useState(false);
  const router = useRouter();
  const [isHoveringPrevious, setIsHoveringPrevious] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [sessionFormData, setSessionFormData] = useState({
    title: "",
    subject: "",
    description: "",
  });

  const handleCreateSession = async () => {
    // Reset error state
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      console.log("Creating study session with data:", sessionFormData);
      const response = await fetch("/api/study_session/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sessionFormData),
      });

      const data = await response.json();

      console.log("Create session response:", data);

      if (data.success) {
        // Redirect to materials upload page with the session id
        router.push(`/upload_materials/${data.data.id}`);
      } else {
        // Show error message
        setErrorMessage(
          data.error || "Failed to create study session. Please try again."
        );
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error creating study session:", error);
      setErrorMessage("An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 relative overflow-hidden">
      {/* Background gradient blobs */}
      <div className="absolute top-0 left-0 w-1/3 h-1/3 bg-blue-200 rounded-full filter blur-3xl opacity-30 transform -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-slate-200 rounded-full filter blur-3xl opacity-30 transform translate-x-1/4 translate-y-1/4"></div>
      <div className="absolute bottom-1/3 left-1/4 w-1/4 h-1/4 bg-slate-200 rounded-full filter blur-3xl opacity-20"></div>

      <div className="container mx-auto px-4 py-16 relative z-10">
        {/* Header */}
        <header className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-white rounded-full shadow-lg">
              <div className="h-16 w-16 bg-gradient-to-br from-blue-700 to-slate-800 rounded-full flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-700 via-slate-700 to-slate-800">
            Fanar Al-Ma3rfa
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your personalized study assistant that makes learning effective,
            efficient, and enjoyable.
          </p>
        </header>

        {/* Main content */}
        <div className="max-w-4xl mx-auto">
          {/* Action cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {/* New session card */}
            <div
              className="relative group h-full"
              onMouseEnter={() => setIsHoveringNew(true)}
              onMouseLeave={() => setIsHoveringNew(false)}
            >
              <Card className="h-[320px] bg-white/80 backdrop-blur border-2 border-blue-100 rounded-2xl overflow-hidden transition-all duration-500 shadow-lg hover:shadow-xl hover:border-blue-300 hover:scale-[1.02]">
                <CardContent className="p-0 h-full">
                  <div className="flex flex-col h-full p-6">
                    <div className="flex-grow">
                      <div className="mb-4 p-3 bg-blue-100 rounded-full w-14 h-14 flex items-center justify-center">
                        <Plus className="h-8 w-8 text-blue-700" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-800 mb-3">
                        Create New Session
                      </h2>
                      <p className="text-gray-600 leading-relaxed">
                        Start a new study session with your materials and let AI organize everything.
                      </p>
                    </div>
                    <div className="mt-6">
                      <Button
                        className="w-full text-white bg-gradient-to-r from-blue-600 to-slate-700 hover:from-blue-700 hover:to-slate-800 group-hover:scale-105 transition-all duration-300 flex items-center justify-center no-loading"
                        onClick={() => setIsCreateModalOpen(true)}
                      >
                        Get Started
                        <ChevronRight
                          className={`ml-2 h-5 w-5 transition-transform duration-300 ${
                            isHoveringNew ? "transform translate-x-1" : ""
                          }`}
                        />
                      </Button>
                    </div>
                  </div>
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-blue-100/30 to-transparent"></div>
                </CardContent>
              </Card>
            </div>

            {/* Previous sessions card */}
            <div
              className="relative group h-full"
              onMouseEnter={() => setIsHoveringPrevious(true)}
              onMouseLeave={() => setIsHoveringPrevious(false)}
            >
              <Card className="h-[320px] bg-white/80 backdrop-blur border-2 border-slate-100 rounded-2xl overflow-hidden transition-all duration-500 shadow-lg hover:shadow-xl hover:border-slate-300 hover:scale-[1.02]">
                <CardContent className="p-0 h-full">
                  <div className="flex flex-col h-full p-6">
                    <div className="flex-grow">
                      <div className="mb-4 p-3 bg-slate-100 rounded-full w-14 h-14 flex items-center justify-center">
                        <History className="h-8 w-8 text-slate-700" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-800 mb-3">
                        Previous Sessions
                      </h2>
                      <p className="text-gray-600 leading-relaxed">
                        Continue from where you left off and track your learning progress.
                      </p>
                    </div>
                    <div className="mt-6">
                      <Button
                        className="w-full text-white bg-gradient-to-r from-slate-600 to-blue-700 hover:from-slate-700 hover:to-blue-800 group-hover:scale-105 transition-all duration-300 flex items-center justify-center"
                        onClick={() => router.push("/sessions")}
                      >
                        View Sessions
                        <ChevronRight
                          className={`ml-2 h-5 w-5 transition-transform duration-300 ${
                            isHoveringPrevious ? "transform translate-x-1" : ""
                          }`}
                        />
                      </Button>
                    </div>
                  </div>
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-slate-100/30 to-transparent"></div>
                </CardContent>
              </Card>
            </div>

            {/* Code Mentor card */}
            <div className="relative group h-full">
              <Card className="h-[320px] bg-white/80 backdrop-blur border-2 border-purple-100 rounded-2xl overflow-hidden transition-all duration-500 shadow-lg hover:shadow-xl hover:border-purple-300 hover:scale-[1.02]">
                <CardContent className="p-0 h-full">
                  <div className="flex flex-col h-full p-6">
                    <div className="flex-grow">
                      <div className="mb-4 p-3 bg-purple-100 rounded-full w-14 h-14 flex items-center justify-center">
                        <Brain className="h-8 w-8 text-purple-700" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-800 mb-3">
                        Code Mentor
                      </h2>
                      <p className="text-gray-600 leading-relaxed">
                        Analyze, understand, and visualize your Python code with AI guidance.
                      </p>
                    </div>
                    <div className="mt-6">
                      <Button
                        className="w-full text-white bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 group-hover:scale-105 transition-all duration-300 flex items-center justify-center"
                        onClick={() => router.push("/code-mentor")}
                      >
                        Start Coding
                        <ChevronRight className="ml-2 h-5 w-5 transition-transform duration-300" />
                      </Button>
                    </div>
                  </div>
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-purple-100/30 to-transparent"></div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Feature highlights */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">
              Supercharge Your Study Sessions
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <Card className="bg-white/80 backdrop-blur border-2 border-blue-100 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-blue-100 rounded-full mb-4">
                      <BookOpen className="h-8 w-8 text-blue-700" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      Smart Materials
                    </h3>
                    <p className="text-gray-600">
                      Upload any study material - PDFs, videos, audio, or links
                      - and let our AI organize and connect everything.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur border-2 border-slate-100 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-slate-100 rounded-full mb-4">
                      <Brain className="h-8 w-8 text-slate-700" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      AI-Powered Learning
                    </h3>
                    <p className="text-gray-600">
                      Our intelligent assistant creates personalized study plans
                      and generates quizzes based on your materials.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur border-2 border-blue-100 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-blue-100 rounded-full mb-4">
                      <Activity className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      Progress Tracking
                    </h3>
                    <p className="text-gray-600">
                      Visualize your learning journey with detailed analytics
                      and track your improvement over time.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur border-2 border-purple-100 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-purple-100 rounded-full mb-4">
                      <Brain className="h-8 w-8 text-purple-700" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      Code Mentor
                    </h3>
                    <p className="text-gray-600">
                      Get AI-powered code analysis, explanations, and visual
                      flowcharts to understand your Python programs better.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* How it works section */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">
              How Fanar Al-Ma3rfa Works
            </h2>

            <div className="relative">
              <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-gradient-to-b from-blue-300 to-slate-600 transform -translate-x-1/2 hidden md:block"></div>

              <div className="space-y-12 relative">
                <div className="flex flex-col md:flex-row items-center">
                  <div className="md:w-1/2 md:pr-12 mb-6 md:mb-0 md:text-right">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      Upload Your Materials
                    </h3>
                    <p className="text-gray-600">
                      Drag and drop any study content - from PDFs and documents
                      to videos and web links. Our system processes everything
                      automatically.
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border-2 border-blue-300 z-10 md:mx-0 mb-6 md:mb-0">
                    <span className="text-xl font-bold text-blue-700">1</span>
                  </div>
                  <div className="md:w-1/2 md:pl-12 md:text-left hidden md:block">
                    <div className="p-4 bg-blue-50 rounded-xl">
                      <BookOpen className="h-12 w-12 text-blue-600 mx-auto" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-center">
                  <div className="md:w-1/2 md:pr-12 mb-6 md:mb-0 md:text-right order-1 md:order-3 hidden md:block">
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <Brain className="h-12 w-12 text-slate-600 mx-auto" />
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border-2 border-slate-300 z-10 order-2 mb-6 md:mb-0">
                    <span className="text-xl font-bold text-slate-700">2</span>
                  </div>
                  <div className="md:w-1/2 md:pl-12 order-3 md:order-1">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      Create Study Session
                    </h3>
                    <p className="text-gray-600">
                      Start a new study session and our AI will organize your
                      materials, create summaries, and prepare interactive
                      learning activities.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-center">
                  <div className="md:w-1/2 md:pr-12 mb-6 md:mb-0 md:text-right">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      Track & Improve
                    </h3>
                    <p className="text-gray-600">
                      Review your progress, identify knowledge gaps, and receive
                      personalized recommendations to improve your
                      understanding.
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border-2 border-blue-300 z-10 mb-6 md:mb-0">
                    <span className="text-xl font-bold text-blue-600">3</span>
                  </div>
                  <div className="md:w-1/2 md:pl-12 hidden md:block">
                    <div className="p-4 bg-blue-50 rounded-xl">
                      <Activity className="h-12 w-12 text-blue-600 mx-auto" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Testimonials */}
                <div className="mb-16">
                <Card className="bg-gradient-to-r from-blue-700 to-slate-800 text-white rounded-2xl overflow-hidden shadow-xl">
                  <CardContent className="p-8">
                  <div className="flex flex-col items-center text-center">
                    <h3 className="text-2xl font-bold mb-4">
                    "Fanar Al-Ma3rfa transformed our learning experience!"
                    </h3>
                    <p className="text-lg mb-6 max-w-2xl">
                    We used to struggle organizing our study materials and staying
                    focused. With Fanar Al-Ma3rfa, everything is in one place
                    and the AI-generated quizzes help us retain information much
                    better.
                    </p>
                    <div className="flex items-center justify-center space-x-8 mt-2">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-3">
                      <span className="text-xl font-bold">TF</span>
                      </div>
                      <div className="text-left">
                      <p className="font-bold">Taha Al-Farawati</p>
                      <p className="text-sm opacity-80">DSAI Student</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-3">
                      <span className="text-xl font-bold">AH</span>
                      </div>
                      <div className="text-left">
                      <p className="font-bold">Najla Zuhir</p>
                      <p className="text-sm opacity-80">DSAI Student</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-3">
                      <span className="text-xl font-bold">PP</span>
                      </div>
                      <div className="text-left">
                      <p className="font-bold">Parvathy Premkumar</p>
                      <p className="text-sm opacity-80">DSAI Student</p>
                      </div>
                    </div>
                    </div>
                  </div>
                  </CardContent>
                </Card>
                </div>
              </div>
              </div>

              {/* Create New Session Modal
      {/* Create New Session Modal */}
      <AlertDialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <AlertDialogContent className="bg-white max-w-xl rounded-2xl border-0 shadow-xl p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-700 to-slate-800 p-6 flex justify-between items-center">
            <AlertDialogHeader className="p-0 space-y-1">
              <AlertDialogTitle className="text-white text-2xl font-bold">
                Create New Study Session
              </AlertDialogTitle>
              <p className="text-blue-100 text-sm">
                Set up your study session details
              </p>
            </AlertDialogHeader>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCreateModalOpen(false)}
              className="text-white hover:bg-white/20 rounded-full h-8 w-8 no-loading"
              disabled={isSubmitting}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="session-title" className="text-gray-700">
                  Session Title
                </Label>
                <Input
                  id="session-title"
                  placeholder="e.g., Biology Midterm Prep"
                  className="border-2 border-gray-200 focus:border-blue-300"
                  value={sessionFormData.title}
                  onChange={(e) =>
                    setSessionFormData({
                      ...sessionFormData,
                      title: e.target.value,
                    })
                  }
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="session-subject" className="text-gray-700">
                  Subject
                </Label>
                <Select
                  value={sessionFormData.subject}
                  onValueChange={(value) =>
                    setSessionFormData({ ...sessionFormData, subject: value })
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger
                    id="session-subject"
                    className="border-2 border-gray-200 focus:border-blue-300"
                  >
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="math">Mathematics</SelectItem>
                    <SelectItem value="science">Science</SelectItem>
                    <SelectItem value="literature">Literature</SelectItem>
                    <SelectItem value="history">History</SelectItem>
                    <SelectItem value="language">Languages</SelectItem>
                    <SelectItem value="arts">Arts</SelectItem>
                    <SelectItem value="computer-science">
                      Computer Science
                    </SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="session-description" className="text-gray-700">
                  Description (Optional)
                </Label>
                <Textarea
                  id="session-description"
                  placeholder="What do you want to achieve in this session?"
                  className="border-2 border-gray-200 focus:border-blue-300 min-h-24"
                  value={sessionFormData.description}
                  onChange={(e) =>
                    setSessionFormData({
                      ...sessionFormData,
                      description: e.target.value,
                    })
                  }
                  disabled={isSubmitting}
                />
              </div>

              {/* Display error message if there is one */}
              {errorMessage && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md border border-red-200 text-sm">
                  {errorMessage}
                </div>
              )}
            </div>
          </div>

          <AlertDialogFooter className="p-6 pt-0">
            <AlertDialogCancel
              className="bg-gray-100 text-gray-700 border-0 hover:bg-gray-200 no-loading"
              disabled={isSubmitting}
              onClick={() => {
                // Explicitly close the modal without setting loading state
                setIsCreateModalOpen(false);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <Button
              className="bg-gradient-to-r from-blue-600 to-slate-700 hover:from-blue-700 hover:to-slate-800 text-white border-0 font-semibold px-6 min-w-[180px] navigation-button"
              onClick={handleCreateSession}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </div>
              ) : (
                "Start Adding Materials"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LandingPage;
