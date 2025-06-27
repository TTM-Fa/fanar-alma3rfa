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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <Loader className="h-12 w-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-800">Loading quiz...</h2>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-800 mb-2">
            Error Loading Quiz
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button
            onClick={() => router.push(`/materials/${materialId}`)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <HelpCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-800 mb-2">
            Quiz Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            The quiz you're looking for could not be found.
          </p>
          <Button
            onClick={() => router.push(`/materials/${materialId}`)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col p-6 md:p-10">
      <div className="max-w-4xl w-full mx-auto">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => router.push(`/materials/${materialId}`)}
          className="mb-6 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Material
        </Button>

        {/* Quiz title and progress */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                {quiz.title}
              </h1>
              <p className="text-gray-600">{quiz.description}</p>
            </div>

            <div className="flex items-center gap-3">
              {!showResults && timer !== null && (
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                    timer < 60 ? "bg-red-100" : "bg-blue-50"
                  }`}
                >
                  <Clock
                    className={`h-5 w-5 ${
                      timer < 60 ? "text-red-500" : "text-blue-500"
                    }`}
                  />
                  <span
                    className={`font-medium ${
                      timer < 60 ? "text-red-500" : "text-blue-500"
                    }`}
                  >
                    {formatTime(timer)}
                  </span>
                </div>
              )}

              <Badge className="bg-purple-100 text-purple-800 text-sm">
                Question {currentQuestionIndex + 1} of {quiz.questions.length}
              </Badge>
            </div>
          </div>

          <Progress
            value={((currentQuestionIndex + 1) / quiz.questions.length) * 100}
            className="h-2 bg-gray-200"
            indicatorClassName="bg-gradient-to-r from-purple-500 to-indigo-600"
          />
        </div>

        {/* Results view */}
        {showResults ? (
          <div className={`${slideInClasses} space-y-8`}>
            <Card className="bg-white shadow-md overflow-hidden">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 mb-4">
                    <span className="text-3xl font-bold text-white">
                      {calculateScore()}%
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    Quiz Complete!
                  </h2>
                  <p className="text-gray-600">
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
                          ? "bg-green-50 border border-green-100"
                          : "bg-red-50 border border-red-100"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {answers[question.id]?.isCorrect ? (
                            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-green-500 text-white">
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
                                  "border border-gray-200 bg-white";
                                if (isSelectedOption && isCorrectOption) {
                                  optionClass = "border-green-500 bg-green-50";
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
                                    "border-green-500 border-dashed bg-white";
                                }

                                return (
                                  <div
                                    key={option.id}
                                    className={`flex items-center p-3 rounded-md ${optionClass} ${isArabicText(option.text) ? 'flex-row-reverse' : ''}`}
                                  >
                                    <div className={`flex-shrink-0 ${isArabicText(option.text) ? 'ml-3' : 'mr-3'}`}>
                                      {isSelectedOption && isCorrectOption && (
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                      )}
                                      {isSelectedOption && !isCorrectOption && (
                                        <X className="h-5 w-5 text-red-500" />
                                      )}
                                      {!isSelectedOption && isCorrectOption && (
                                        <div className="h-5 w-5 border-2 border-green-500 rounded-full flex items-center justify-center">
                                          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
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
                                  "border border-gray-200 bg-white";
                                if (isSelectedOption && isCorrectOption) {
                                  optionClass = "border-green-500 bg-green-50";
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
                                    "border-green-500 border-dashed bg-white";
                                }

                                return (
                                  <div
                                    key={option.id}
                                    className={`flex items-center p-3 rounded-md ${optionClass} ${isArabicText(option.text) ? 'flex-row-reverse' : ''}`}
                                  >
                                    <div className={`flex-shrink-0 ${isArabicText(option.text) ? 'ml-3' : 'mr-3'}`}>
                                      {isSelectedOption && isCorrectOption && (
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                      )}
                                      {isSelectedOption && !isCorrectOption && (
                                        <X className="h-5 w-5 text-red-500" />
                                      )}
                                      {!isSelectedOption && isCorrectOption && (
                                        <div className="h-5 w-5 border-2 border-green-500 rounded-md flex items-center justify-center">
                                          <Check className="h-3 w-3 text-green-500" />
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
                            <div className="mt-4 bg-blue-50 p-3 rounded-md flex">
                              <Lightbulb className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                              <p 
                                className="text-sm text-blue-800"
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
                  className={"no-loading"}
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
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
                >
                  Back to Material
                </Button>
              </CardFooter>
            </Card>
          </div>
        ) : (
          /* Question view */
          <div className={`${slideInClasses}`}>
            <Card className="bg-white shadow-md overflow-hidden">
              <CardContent className="p-8">
                {/* Question */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Badge
                      className={
                        currentQuestion.type === "multi-select"
                          ? "bg-indigo-100 text-indigo-800"
                          : currentQuestion.type === "true-false"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-purple-100 text-purple-800"
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
                                ? "border-purple-500 bg-purple-50"
                                : "border-gray-200 hover:border-purple-200 hover:bg-purple-50/50"
                            } ${isArabicText(option.text) ? 'flex-row-reverse' : ''}`}
                        >
                          <div className={`flex-shrink-0 ${isArabicText(option.text) ? 'ml-4' : 'mr-4'}`}>
                            <div
                              className={`h-6 w-6 rounded-full border-2 flex items-center justify-center
                                ${
                                  selectedOptions[currentQuestion.id] ===
                                  option.id
                                    ? "border-purple-500"
                                    : "border-gray-300"
                                }`}
                            >                              {selectedOptions[currentQuestion.id] ===
                                option.id && (
                                <div className="h-3 w-3 rounded-full bg-purple-500"></div>
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
                                  ? "border-indigo-500 bg-indigo-50"
                                  : "border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/50"
                              } ${isArabicText(option.text) ? 'flex-row-reverse' : ''}`}
                          >
                            <div className={`flex-shrink-0 ${isArabicText(option.text) ? 'ml-4' : 'mr-4'}`}>
                              <div
                                className={`h-6 w-6 rounded-md border-2 flex items-center justify-center
                                  ${
                                    isSelected
                                      ? "border-indigo-500 bg-indigo-500"
                                      : "border-gray-300"
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
                            ? "bg-purple-500"
                            : isQuestionAnswered(quiz.questions[index].id)
                            ? "bg-green-500"
                            : "bg-gray-300"
                        }`}
                      />
                    ))}
                  </div>

                  {currentQuestionIndex < quiz.questions.length - 1 ? (
                    <Button
                      onClick={handleNextQuestion}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white no-loading"
                    >
                      Next
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmitQuiz}
                      className={`bg-gradient-to-r from-purple-600 to-indigo-600 text-white transition-all no-loading ${
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
              <div className="flex items-center bg-white rounded-full px-3 py-1 shadow-sm border">
                {quiz.questions.map((question, index) => (
                  <div
                    key={index}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`
                      w-8 h-8 flex items-center justify-center rounded-full cursor-pointer mx-1
                      ${
                        currentQuestionIndex === index
                          ? "bg-purple-600 text-white"
                          : isQuestionAnswered(question.id)
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
