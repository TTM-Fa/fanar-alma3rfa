"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Brain,
  Lightbulb,
  Award,
  Loader,
} from "lucide-react";

// Blue/Navy theme colors
const NAVY = "#223366";
const BLUE = "#2563eb";
const LIGHT_BLUE = "#7eb6ff";
const BLUE_BG = "#eaf0fa";

// Utility function to detect Arabic text
const isArabicText = (text) => {
  if (!text) return false;
  // Check for Arabic Unicode range
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicRegex.test(text);
};

const QuizPage = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const materialId = params.materialId;
  const quizId = searchParams.get("quizId");

  // Quiz state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selectedOptions, setSelectedOptions] = useState({});
  const [quizComplete, setQuizComplete] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [timer, setTimer] = useState(null);
  const [timerActive, setTimerActive] = useState(true);

  // Fetch quiz data
  useEffect(() => {
    const fetchQuizData = async () => {
      if (!quizId) {
        setError("No quiz ID provided");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/quiz/${quizId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch quiz: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.quiz) {
          setQuiz(data.quiz);
          // Initialize timer if quiz has a time limit
          if (data.quiz.timeLimit) {
            setTimer(data.quiz.timeLimit * 60); // convert minutes to seconds
          } else {
            setTimer(null); // No time limit
          }
        } else {
          throw new Error(data.error || "Failed to fetch quiz data");
        }
      } catch (error) {
        console.error("Error fetching quiz:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizData();
  }, [quizId]);

  // Effect to handle the timer
  useEffect(() => {
    let interval = null;

    if (timer !== null && timerActive && timer > 0 && !quizComplete) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    } else if (timer === 0 && !quizComplete) {
      setQuizComplete(true);
      setShowResults(true);
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [timer, timerActive, quizComplete]);

  // Function to format the timer
  const formatTime = (seconds) => {
    if (seconds === null) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleOptionClick = (questionId, optionId) => {
    if (quizComplete) return;

    const currentQuestion = quiz.questions[currentQuestionIndex];

    if (
      currentQuestion.type === "multiple-choice" ||
      currentQuestion.type === "true-false"
    ) {
      setSelectedOptions({
        ...selectedOptions,
        [questionId]: optionId,
      });
    } else if (currentQuestion.type === "multi-select") {
      const currentSelections = selectedOptions[questionId] || [];

      // Toggle selection
      if (currentSelections.includes(optionId)) {
        setSelectedOptions({
          ...selectedOptions,
          [questionId]: currentSelections.filter((id) => id !== optionId),
        });
      } else {
        setSelectedOptions({
          ...selectedOptions,
          [questionId]: [...currentSelections, optionId],
        });
      }
    }
  };

  const handleNextQuestion = () => {
    if (quiz && currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setQuizComplete(true);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitQuiz = () => {
    setQuizComplete(true);
    setTimerActive(false);
    setShowResults(true);

    // Calculate results
    if (!quiz) return;

    const tempAnswers = {};
    quiz.questions.forEach((question) => {
      const userAnswer = selectedOptions[question.id];

      if (
        question.type === "multiple-choice" ||
        question.type === "true-false"
      ) {
        tempAnswers[question.id] = {
          isCorrect: userAnswer === question.correctAnswer,
          userAnswer,
          correctAnswer: question.correctAnswer,
        };
      } else if (question.type === "multi-select") {
        const selectedOptions = userAnswer || [];
        const correctOptions = question.correctAnswer;

        // Check if arrays contain the same elements
        const isCorrect =
          correctOptions.length === selectedOptions.length &&
          correctOptions.every((option) => selectedOptions.includes(option));

        tempAnswers[question.id] = {
          isCorrect,
          userAnswer: selectedOptions,
          correctAnswer: question.correctAnswer,
        };
      }
    });

    setAnswers(tempAnswers);
  };

  const calculateScore = () => {
    if (!quiz) return 0;

    const totalQuestions = quiz.questions.length;
    const correctAnswers = Object.values(answers).filter(
      (answer) => answer.isCorrect
    ).length;
    return Math.round((correctAnswers / totalQuestions) * 100);
  };

  const isQuestionAnswered = (questionId) => {
    return (
      selectedOptions[questionId] !== undefined &&
      (typeof selectedOptions[questionId] === "string" ||
        (Array.isArray(selectedOptions[questionId]) &&
          selectedOptions[questionId].length > 0))
    );
  };

  const allQuestionsAnswered = () => {
    return (
      quiz &&
      quiz.questions.every((question) => isQuestionAnswered(question.id))
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <Loader className="h-12 w-12 text-[#2563eb] animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-medium text-[#223366]">Loading quiz...</h2>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-[#2563eb] mx-auto mb-4" />
          <h2 className="text-xl font-medium text-[#223366] mb-2">
            Error Loading Quiz
          </h2>
          <p className="text-[#223366] mb-6">{error}</p>
          <Button
            onClick={() => router.push(`/materials/${materialId}`)}
            className="bg-gradient-to-r from-[#7eb6ff] to-[#2563eb] text-white font-bold border border-[#7eb6ff] shadow-lg transition-transform duration-200 hover:-translate-y-1 hover:shadow-2xl hover:from-[#2563eb] hover:to-[#7eb6ff] focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Material
          </Button>
        </div>
      </div>
    );
  }

  // If no quiz found
  if (!quiz) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <HelpCircle className="h-16 w-16 text-[#fbbf24] mx-auto mb-4" />
          <h2 className="text-xl font-medium text-[#223366] mb-2">
            Quiz Not Found
          </h2>
          <p className="text-[#223366] mb-6">
            The quiz you're looking for could not be found.
          </p>
          <Button
            onClick={() => router.push(`/materials/${materialId}`)}
            className="bg-gradient-to-r from-[#7eb6ff] to-[#2563eb] text-white font-bold border border-[#7eb6ff] shadow-lg transition-transform duration-200 hover:-translate-y-1 hover:shadow-2xl hover:from-[#2563eb] hover:to-[#7eb6ff] focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Material
          </Button>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];

  // Animation classes
  const slideInClasses = "animate-in slide-in-from-right duration-300";

  return (
    <div className="min-h-screen bg-white flex flex-col p-6 md:p-10">
      <div className="max-w-4xl w-full mx-auto">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => router.push(`/materials/${materialId}`)}
          className="mb-6 text-[#223366] hover:text-[#142042] hover:bg-[#eaf0fa]"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Material
        </Button>

        {/* Quiz title and progress */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#223366]">
                {quiz.title}
              </h1>
              <p className="text-[#223366]">{quiz.description}</p>
            </div>

            <div className="flex items-center gap-3">
              {!showResults && timer !== null && (
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                    timer < 60 ? "bg-red-100" : "bg-[#eaf0fa] border border-[#b3c6e0]"
                  }`}
                >
                  <Clock
                    className={`h-5 w-5 ${
                      timer < 60 ? "text-red-500" : "text-[#2563eb]"
                    }`}
                  />
                  <span
                    className={`font-medium ${
                      timer < 60 ? "text-red-500" : "text-[#2563eb]"
                    }`}
                  >
                    {formatTime(timer)}
                  </span>
                </div>
              )}

              <Badge className="bg-[#eaf0fa] text-[#223366] border border-[#b3c6e0] text-sm">
                Question {currentQuestionIndex + 1} of {quiz.questions.length}
              </Badge>
            </div>
          </div>

          <Progress
            value={((currentQuestionIndex + 1) / quiz.questions.length) * 100}
            className="h-2 bg-[#b3c6e0]"
            indicatorClassName="bg-gradient-to-r from-[#7eb6ff] to-[#2563eb]"
          />
        </div>

        {/* Results view */}
        {showResults ? (
          <div className={`${slideInClasses} space-y-8`}>
            <Card className="bg-white shadow-md overflow-hidden border border-[#b3c6e0]">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-gradient-to-r from-[#7eb6ff] to-[#2563eb] mb-4">
                    <span className="text-3xl font-bold text-white">
                      {calculateScore()}%
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-[#223366] mb-2">
                    Quiz Complete!
                  </h2>
                  <p className="text-[#223366]">
                    You answered{" "}
                    {
                      Object.values(answers).filter(
                        (answer) => answer.isCorrect
                      ).length
                    }{" "}
                    out of {quiz.questions.length} questions correctly.
                  </p>
                </div>

                <div className="space-y-6">
                  {quiz.questions.map((question, index) => (
                    <div
                      key={question.id}
                      className={`p-4 rounded-lg ${
                        answers[question.id]?.isCorrect
                          ? "bg-[#eaf0fa] border border-[#7eb6ff]"
                          : "bg-red-50 border border-red-100"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {answers[question.id]?.isCorrect ? (
                            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-[#2563eb] text-white">
                              <Check className="h-4 w-4" />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-red-500 text-white">
                              <X className="h-4 w-4" />
                            </div>
                          )}
                        </div>                        <div className="flex-1 space-y-2">
                          <h3 
                            className="font-medium text-gray-800"
                            style={{ 
                              direction: isArabicText(question.text) ? 'rtl' : 'ltr',
                              textAlign: isArabicText(question.text) ? 'right' : 'left'
                            }}
                          >
                            {index + 1}. {question.text}
                          </h3>                          {/* Multiple choice answer display */}
                          {(question.type === "multiple-choice" ||
                            question.type === "true-false") && (
                            <div className="grid grid-cols-1 gap-2">
                              {question.options.map((option) => {
                                const isSelectedOption =
                                  selectedOptions[question.id] === option.id;
                                const isCorrectOption =
                                  question.correctAnswer === option.id;

                                let optionClass =
                                  "border border-[#b3c6e0] bg-white";
                                if (isSelectedOption && isCorrectOption) {
                                  optionClass = "border-[#2563eb] bg-[#eaf0fa]";
                                } else if ( 
                                  isSelectedOption &&
                                  !isCorrectOption
                                ) {
                                  optionClass = "border-red-500 bg-red-50";
                                } else if (
                                  !isSelectedOption &&
                                  isCorrectOption
                                ) {
                                  optionClass =
                                    "border-[#2563eb] border-dashed bg-white";
                                }

                                return (
                                  <div
                                    key={option.id}
                                    className={`flex items-center p-3 rounded-md ${optionClass} ${isArabicText(option.text) ? 'flex-row-reverse' : ''}`}
                                  >
                                    <div className={`flex-shrink-0 ${isArabicText(option.text) ? 'ml-3' : 'mr-3'}`}>
                                      {isSelectedOption && isCorrectOption && (
                                        <CheckCircle className="h-5 w-5 text-[#2563eb]" />
                                      )}
                                      {isSelectedOption && !isCorrectOption && (
                                        <X className="h-5 w-5 text-red-500" />
                                      )}
                                      {!isSelectedOption && isCorrectOption && (
                                        <div className="h-5 w-5 border-2 border-[#2563eb] rounded-full flex items-center justify-center">
                                          <div className="h-2 w-2 bg-[#2563eb] rounded-full"></div>
                                        </div>
                                      )}                                      {!isSelectedOption &&
                                        !isCorrectOption && (
                                          <div className="h-5 w-5 border-2 border-gray-300 rounded-full"></div>
                                        )}
                                    </div>
                                    <span 
                                      className="text-gray-800"
                                      style={{ 
                                        direction: isArabicText(option.text) ? 'rtl' : 'ltr',
                                        textAlign: isArabicText(option.text) ? 'right' : 'left'
                                      }}
                                    >
                                      {option.text}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}                          {/* Multi-select answer display */}
                          {question.type === "multi-select" && (
                            <div className="grid grid-cols-1 gap-2">
                              {question.options.map((option) => {
                                const isSelectedOption = (
                                  selectedOptions[question.id] || []
                                ).includes(option.id);
                                const isCorrectOption =
                                  question.correctAnswer.includes(option.id);

                                let optionClass =
                                  "border border-[#b3c6e0] bg-white";
                                if (isSelectedOption && isCorrectOption) {
                                  optionClass = "border-[#2563eb] bg-[#eaf0fa]";
                                } else if (
                                  isSelectedOption && !isCorrectOption
                                ) {
                                  optionClass = "border-red-500 bg-red-50";
                                } else if (
                                  !isSelectedOption && isCorrectOption
                                ) {
                                  optionClass =
                                    "border-[#2563eb] border-dashed bg-white";
                                }

                                return (
                                  <div
                                    key={option.id}
                                    className={`flex items-center p-3 rounded-md ${optionClass} ${isArabicText(option.text) ? 'flex-row-reverse' : ''}`}
                                  >
                                    <div className={`flex-shrink-0 ${isArabicText(option.text) ? 'ml-3' : 'mr-3'}`}>
                                      {isSelectedOption && isCorrectOption && (
                                        <CheckCircle className="h-5 w-5 text-[#2563eb]" />
                                      )}
                                      {isSelectedOption && !isCorrectOption && (
                                        <X className="h-5 w-5 text-red-500" />
                                      )}
                                      {!isSelectedOption && isCorrectOption && (
                                        <div className="h-5 w-5 border-2 border-[#2563eb] rounded-md flex items-center justify-center">
                                          <Check className="h-3 w-3 text-[#2563eb]" />
                                        </div>
                                      )}                                      {!isSelectedOption &&
                                        !isCorrectOption && (
                                          <div className="h-5 w-5 border-2 border-gray-300 rounded-md"></div>
                                        )}
                                    </div>
                                    <span 
                                      className="text-gray-800"
                                      style={{ 
                                        direction: isArabicText(option.text) ? 'rtl' : 'ltr',
                                        textAlign: isArabicText(option.text) ? 'right' : 'left'
                                      }}
                                    >
                                      {option.text}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Explanation */}                          {question.explanation && (
                            <div className="mt-4 bg-[#eaf0fa] p-3 rounded-md flex">
                              <Lightbulb className="h-5 w-5 text-[#2563eb] mr-2 flex-shrink-0 mt-0.5" />
                              <p 
                                className="text-sm text-[#223366]"
                                style={{ 
                                  direction: isArabicText(question.explanation) ? 'rtl' : 'ltr',
                                  textAlign: isArabicText(question.explanation) ? 'right' : 'left'
                                }}
                              >
                                {question.explanation}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>

              <CardFooter className="px-8 pb-8 flex justify-center gap-4">
                <Button
                  variant="outline"
                  className={"no-loading border-[#b3c6e0] text-[#223366]"}
                  onClick={() => {
                    setSelectedOptions({});
                    setCurrentQuestionIndex(0);
                    setQuizComplete(false);
                    setShowResults(false);
                    if (quiz.timeLimit) {
                      setTimer(quiz.timeLimit * 60);
                    }
                    setTimerActive(true);
                  }}
                >
                  Try Again
                </Button>
                <Button
                  onClick={() => router.push(`/materials/${materialId}`)}
                  className="bg-gradient-to-r from-[#7eb6ff] to-[#2563eb] text-white font-bold border border-[#7eb6ff] shadow-lg transition-transform duration-200 hover:-translate-y-1 hover:shadow-2xl hover:from-[#2563eb] hover:to-[#7eb6ff] focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2"
                >
                  Back to Material
                </Button>
              </CardFooter>
            </Card>
          </div>
        ) : (
          /* Question view */
          <div className={`${slideInClasses}`}>
            <Card className="bg-white shadow-md overflow-hidden border border-[#b3c6e0]">
              <CardContent className="p-8">
                {/* Question */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Badge
                      className={
                        currentQuestion.type === "multi-select"
                          ? "bg-[#eaf0fa] text-[#2563eb] border border-[#b3c6e0]"
                          : currentQuestion.type === "true-false"
                          ? "bg-[#eaf0fa] text-[#223366] border border-[#b3c6e0]"
                          : "bg-[#eaf0fa] text-[#223366] border border-[#b3c6e0]"
                      }
                    >
                      {currentQuestion.type === "multi-select"
                        ? "Select Multiple"
                        : currentQuestion.type === "true-false"
                        ? "True/False"
                        : "Single Choice"}
                    </Badge>

                    {currentQuestion.type === "multi-select" && (
                      <p className="text-sm text-gray-600 italic">
                        Select all that apply
                      </p>
                    )}
                  </div>                  <h2 
                    className="text-xl md:text-2xl font-semibold text-gray-800 mb-6"
                    style={{ 
                      direction: isArabicText(currentQuestion.text) ? 'rtl' : 'ltr',
                      textAlign: isArabicText(currentQuestion.text) ? 'right' : 'left'
                    }}
                  >
                    {currentQuestionIndex + 1}. {currentQuestion.text}
                  </h2>

                  <div className="space-y-3">
                    {/* Multiple Choice Options */}
                    {(currentQuestion.type === "multiple-choice" ||
                      currentQuestion.type === "true-false") &&
                      currentQuestion.options.map((option) => (
                        <div
                          key={option.id}
                          onClick={() =>
                            handleOptionClick(currentQuestion.id, option.id)
                          }                          className={`flex items-center p-4 rounded-lg border-2 transition-all cursor-pointer 
                            ${
                              selectedOptions[currentQuestion.id] === option.id
                                ? "border-[#2563eb] bg-[#eaf0fa]"
                                : "border-[#b3c6e0] hover:border-[#7eb6ff] hover:bg-[#eaf0fa]"
                            } ${isArabicText(option.text) ? 'flex-row-reverse' : ''}`}
                        >
                          <div className={`flex-shrink-0 ${isArabicText(option.text) ? 'ml-4' : 'mr-4'}`}>
                            <div
                              className={`h-6 w-6 rounded-full border-2 flex items-center justify-center
                                ${
                                  selectedOptions[currentQuestion.id] ===
                                  option.id
                                    ? "border-[#2563eb]"
                                    : "border-[#b3c6e0]"
                                }`}
                            >                              {selectedOptions[currentQuestion.id] ===
                                option.id && (
                                <div className="h-3 w-3 rounded-full bg-[#2563eb]"></div>
                              )}
                            </div>
                          </div>
                          <span 
                            className="text-gray-800"
                            style={{ 
                              direction: isArabicText(option.text) ? 'rtl' : 'ltr',
                              textAlign: isArabicText(option.text) ? 'right' : 'left'
                            }}
                          >
                            {option.text}
                          </span>
                        </div>
                      ))}

                    {/* Multi-Select Options */}
                    {currentQuestion.type === "multi-select" &&
                      currentQuestion.options.map((option) => {
                        const isSelected = (
                          selectedOptions[currentQuestion.id] || []
                        ).includes(option.id);

                        return (
                          <div
                            key={option.id}
                            onClick={() =>
                              handleOptionClick(currentQuestion.id, option.id)
                            }                            className={`flex items-center p-4 rounded-lg border-2 transition-all cursor-pointer 
                              ${
                                isSelected
                                  ? "border-[#2563eb] bg-[#eaf0fa]"
                                  : "border-[#b3c6e0] hover:border-[#7eb6ff] hover:bg-[#eaf0fa]"
                              } ${isArabicText(option.text) ? 'flex-row-reverse' : ''}`}
                          >
                            <div className={`flex-shrink-0 ${isArabicText(option.text) ? 'ml-4' : 'mr-4'}`}>
                              <div
                                className={`h-6 w-6 rounded-md border-2 flex items-center justify-center
                                  ${
                                    isSelected
                                      ? "border-[#2563eb] bg-[#2563eb]"
                                      : "border-[#b3c6e0]"
                                  }`}
                              >                                {isSelected && (
                                  <Check className="h-4 w-4 text-white" />
                                )}
                              </div>
                            </div>
                            <span 
                              className="text-gray-800"
                              style={{ 
                                direction: isArabicText(option.text) ? 'rtl' : 'ltr',
                                textAlign: isArabicText(option.text) ? 'right' : 'left'
                              }}
                            >
                              {option.text}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Navigation buttons */}
                <div className="flex items-center justify-between mt-8">
                  <Button
                    variant="outline"
                    onClick={handlePreviousQuestion}
                    disabled={currentQuestionIndex === 0}
                    className={
                      currentQuestionIndex === 0
                        ? "opacity-50 cursor-not-allowed no-loading"
                        : "no-loading"
                    }
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>

                  <div className="flex gap-2">
                    {quiz.questions.map((_, index) => (
                      <div
                        key={index}
                        className={`h-2 w-2 rounded-full ${
                          index === currentQuestionIndex
                            ? "bg-[#2563eb]"
                            : isQuestionAnswered(quiz.questions[index].id)
                            ? "bg-[#eaf0fa] text-[#2563eb] border border-[#2563eb]"
                            : "bg-white text-[#223366] border border-[#b3c6e0] hover:bg-[#eaf0fa]"
                        }`}
                      />
                    ))}
                  </div>

                  {currentQuestionIndex < quiz.questions.length - 1 ? (
                    <Button
                      onClick={handleNextQuestion}
                      className="bg-gradient-to-r from-[#7eb6ff] to-[#2563eb] text-white no-loading"
                    >
                      Next
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmitQuiz}
                      className={`bg-gradient-to-r from-[#7eb6ff] to-[#2563eb] text-white transition-all no-loading ${
                        !allQuestionsAnswered() ? "opacity-80" : ""
                      }`}
                    >
                      Submit Quiz
                      <Check className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Question counter */}
            <div className="flex justify-center mt-6">
              <div className="flex items-center bg-[#eaf0fa] rounded-full px-3 py-1 shadow-sm border border-[#b3c6e0]">
                {quiz.questions.map((question, index) => (
                  <div
                    key={index}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`
                      w-8 h-8 flex items-center justify-center rounded-full cursor-pointer mx-1
                      ${
                        currentQuestionIndex === index
                          ? "bg-[#2563eb] text-white"
                          : isQuestionAnswered(question.id)
                          ? "bg-[#eaf0fa] text-[#2563eb] border border-[#2563eb]"
                          : "bg-white text-[#223366] border border-[#b3c6e0] hover:bg-[#eaf0fa]"
                      }
                    `}
                  >
                    {index + 1}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizPage;
