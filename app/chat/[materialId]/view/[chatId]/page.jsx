"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  Brain,
  Loader,
  Send,
  User,
  Bot,
  MessageCircle,
  RefreshCw,
  BookOpen,
} from "lucide-react";

const ChatViewPage = () => {
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);  const [question, setQuestion] = useState("");
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastReferences, setLastReferences] = useState([]);

  const messagesEndRef = useRef(null);
  const params = useParams();
  const router = useRouter();
  const materialId = params.materialId;
  const chatId = params.chatId;

  useEffect(() => {
    const fetchChatAndMessages = async () => {
      if (!chatId) return;

      try {
        const response = await fetch(`/api/chat/messages/${chatId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch chat: ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
          setChat(data.chat);
          setMessages(data.messages);
        } else {
          throw new Error(data.error || "Unknown error fetching chat");
        }
      } catch (error) {
        console.error("Error fetching chat:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchChatAndMessages();
  }, [chatId]);

  useEffect(() => {
    // Scroll to bottom when messages change or when streaming
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  // Typewriter effect function
  const typewriterEffect = (text, callback) => {
    setIsStreaming(true);
    setStreamingMessage("");
    
    let index = 0;
    const timer = setInterval(() => {
      if (index < text.length) {
        setStreamingMessage(prev => prev + text[index]);
        index++;
        
        // Scroll to bottom during typing
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 10);
      } else {
        clearInterval(timer);
        setIsStreaming(false);
        setStreamingMessage("");
        callback();
      }
    }, 15); // Fast typing speed - 15ms per character
    
    return timer;
  };

  const handleSendMessage = async () => {
    if (!question.trim() || sending) return;    const currentQuestion = question.trim();
    setQuestion("");
    setSending(true);
    setError(null);
    setLastReferences([]); // Clear previous references

    // Add user message to UI immediately
    const userMessage = {
      id: `temp-${Date.now()}`,
      content: currentQuestion,
      role: "user",
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch(`/api/chat/messages/${chatId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: currentQuestion,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // First add the user message immediately
        setMessages(prev => {
          const withoutTemp = prev.filter(msg => !msg.id.startsWith("temp-"));
          return [...withoutTemp, data.userMessage];
        });        // Then start the typewriter effect for the assistant message
        typewriterEffect(data.assistantMessage.content, () => {
          // After typewriter effect completes, add the final assistant message
          setMessages(prev => [...prev, data.assistantMessage]);
          // Store references if available
          if (data.references && data.references.length > 0) {
            setLastReferences(data.references);
          }
        });
      } else {
        throw new Error(data.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setError(error.message);
      // Remove the temporary message on error
      setMessages(prev => prev.filter(msg => !msg.id.startsWith("temp-")));
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const refreshChat = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <Loader className="h-12 w-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-800">
            Loading chat...
          </h2>
        </div>
      </div>
    );
  }

  if (error && !chat) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h2 className="text-xl font-medium text-gray-800 mb-2">
            Error Loading Chat
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push(`/chat/${materialId}/list`)}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Chats
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-cyan-100">
                  <Brain className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-800">
                    {chat?.title || "Chat"}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {chat?.materialTitle || "Material"}
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshChat}
              className="hidden sm:flex"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Chat content */}
      <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-800 mb-2">
                  Start the conversation
                </h3>
                <p className="text-gray-600">
                  Ask any question about your material and get AI-powered answers.
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={message.id || index}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  )}

                  <div
                    className={`max-w-[70%] ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg rounded-br-sm"
                        : "bg-white border border-gray-200 rounded-lg rounded-bl-sm"
                    } p-4 shadow-sm`}
                  >
                    {message.role === "assistant" ? (
                      <div className={`prose prose-sm max-w-none ${
                        message.role === "user" ? "prose-invert" : ""
                      }`}>
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            em: ({ children }) => <em className="italic">{children}</em>,
                            code: ({ children }) => (
                              <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">
                                {children}
                              </code>
                            ),
                            pre: ({ children }) => (
                              <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto text-sm">
                                {children}
                              </pre>
                            ),
                            ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                            li: ({ children }) => <li className="mb-1">{children}</li>,
                            h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span
                        className={`text-xs ${
                          message.role === "user"
                            ? "text-blue-100"
                            : "text-gray-500"
                        }`}
                      >
                        {formatTime(message.createdAt)}
                      </span>
                    </div>
                  </div>

                  {message.role === "user" && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            
            {/* Show streaming message if active */}
            {isStreaming && streamingMessage && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                </div>

                <div className="max-w-[70%] bg-white border border-gray-200 rounded-lg rounded-bl-sm p-4 shadow-sm">
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        code: ({ children }) => (
                          <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">
                            {children}
                          </code>
                        ),
                        pre: ({ children }) => (
                          <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto text-sm">
                            {children}
                          </pre>
                        ),
                        ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                        li: ({ children }) => <li className="mb-1">{children}</li>,
                      }}
                    >
                      {streamingMessage}
                    </ReactMarkdown>
                    <span className="inline-block w-0.5 h-4 bg-blue-500 animate-pulse ml-0.5 align-middle"></span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">
                      typing...
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>        </div>        {/* Compact References */}
        {lastReferences.length > 0 && (
          <div className="border-t border-blue-100 bg-blue-50/50 px-6 py-2">
            <div className="flex items-center gap-2 text-xs text-blue-700">
              <BookOpen className="h-3 w-3" />
              <span className="font-medium">{lastReferences.length} sources</span>
              <div className="flex gap-1 ml-2">
                {lastReferences.slice(0, 3).map((ref, index) => (
                  <div key={index} className="bg-white/80 px-2 py-1 rounded text-xs border border-blue-200 max-w-32 truncate">
                    {ref.text.substring(0, 25)}...
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-gray-200 bg-white p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          
          <div className="flex gap-3">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={sending || isStreaming ? "AI is responding..." : "Ask a question about your material..."}
              disabled={sending || isStreaming}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!question.trim() || sending || isStreaming}
              className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700"
            >
              {sending || isStreaming ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatViewPage;
