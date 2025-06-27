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
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Sparkles,
  Loader,
  AlertCircle,
  HelpCircle,
  FileText,
  BookOpen,
  Download,
  Share2,
  Copy,
  Printer,
  Check,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";

// Utility function to detect Arabic text
const isArabicText = (text) => {
  if (!text) return false;
  // Check for Arabic Unicode range
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicRegex.test(text);
};

const MarkdownComponents = {
  h1: (props) => {
    const isArabic = isArabicText(props.children);
    return (
      <h1
        className="text-3xl font-bold text-gray-800 mb-4 mt-8 border-b pb-2"
        style={{
          direction: isArabic ? 'rtl' : 'ltr',
          textAlign: isArabic ? 'right' : 'left'
        }}
        {...props}
      />
    );
  },
  h2: (props) => {
    const isArabic = isArabicText(props.children);
    return (
      <h2
        className="text-2xl font-bold text-gray-800 mb-3 mt-6 border-b pb-2"
        style={{
          direction: isArabic ? 'rtl' : 'ltr',
          textAlign: isArabic ? 'right' : 'left'
        }}
        {...props}
      />
    );
  },
  h3: (props) => {
    const isArabic = isArabicText(props.children);
    return (
      <h3 
        className="text-xl font-bold text-gray-800 mb-3 mt-5"
        style={{
          direction: isArabic ? 'rtl' : 'ltr',
          textAlign: isArabic ? 'right' : 'left'
        }}
        {...props} 
      />
    );
  },
  h4: (props) => {
    const isArabic = isArabicText(props.children);
    return (
      <h4 
        className="text-lg font-bold text-gray-800 mb-2 mt-4"
        style={{
          direction: isArabic ? 'rtl' : 'ltr',
          textAlign: isArabic ? 'right' : 'left'
        }}
        {...props} 
      />
    );
  },
  h5: (props) => {
    const isArabic = isArabicText(props.children);
    return (
      <h5 
        className="text-base font-bold text-gray-800 mb-2 mt-3"
        style={{
          direction: isArabic ? 'rtl' : 'ltr',
          textAlign: isArabic ? 'right' : 'left'
        }}
        {...props} 
      />
    );
  },
  h6: (props) => {
    const isArabic = isArabicText(props.children);
    return (
      <h6 
        className="text-sm font-bold text-gray-800 mb-2 mt-3"
        style={{
          direction: isArabic ? 'rtl' : 'ltr',
          textAlign: isArabic ? 'right' : 'left'
        }}
        {...props} 
      />
    );
  },
  p: (props) => {
    const isArabic = isArabicText(props.children);
    return (
      <p 
        className="text-gray-700 mb-4 leading-relaxed"
        style={{
          direction: isArabic ? 'rtl' : 'ltr',
          textAlign: isArabic ? 'right' : 'left'
        }}
        {...props} 
      />
    );
  },  ul: (props) => {
    const isArabic = isArabicText(props.children);
    return (
      <ul 
        className="list-disc pl-6 mb-4 space-y-1"
        style={{
          direction: isArabic ? 'rtl' : 'ltr',
          paddingLeft: isArabic ? '0' : '1.5rem',
          paddingRight: isArabic ? '1.5rem' : '0'
        }}
        {...props} 
      />
    );
  },
  ol: (props) => {
    const isArabic = isArabicText(props.children);
    return (
      <ol 
        className="list-decimal pl-6 mb-4 space-y-1"
        style={{
          direction: isArabic ? 'rtl' : 'ltr',
          paddingLeft: isArabic ? '0' : '1.5rem',
          paddingRight: isArabic ? '1.5rem' : '0'
        }}
        {...props} 
      />
    );
  },
  li: (props) => {
    const isArabic = isArabicText(props.children);
    return (
      <li 
        className="mb-1 text-gray-700"
        style={{
          direction: isArabic ? 'rtl' : 'ltr',
          textAlign: isArabic ? 'right' : 'left'
        }}
        {...props} 
      />
    );
  },  blockquote: (props) => {
    const isArabic = isArabicText(props.children);
    return (
      <blockquote
        className="border-l-4 border-rose-300 pl-4 italic text-gray-700 mb-4"
        style={{
          direction: isArabic ? 'rtl' : 'ltr',
          borderLeft: isArabic ? 'none' : '4px solid rgb(253 164 175)',
          borderRight: isArabic ? '4px solid rgb(253 164 175)' : 'none',
          paddingLeft: isArabic ? '0' : '1rem',
          paddingRight: isArabic ? '1rem' : '0'
        }}
        {...props}
      />
    );
  },
  strong: (props) => {
    const isArabic = isArabicText(props.children);
    return (
      <strong 
        className="font-bold"
        style={{
          direction: isArabic ? 'rtl' : 'ltr',
          borderLeft: isArabic ? 'none' : '4px solid rgb(253 164 175)',
          borderRight: isArabic ? '4px solid rgb(253 164 175)' : 'none',
          paddingLeft: isArabic ? '0' : '1rem',
          paddingRight: isArabic ? '1rem' : '0'

        }}
        {...props} 
      />
    );
  },
  a: (props) => (
    <a
      className="text-rose-600 hover:text-rose-800 underline"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  code: (props) => {
    if (props.className) {
      return (
        <div className="bg-gray-100 rounded-md p-4 mb-4 overflow-x-auto">
          <code
            className={`${props.className} text-sm font-mono text-gray-800`}
            {...props}
          />
        </div>
      );
    }
    return (
      <code
        className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-gray-800"
        {...props}
      />
    );
  },
  pre: (props) => (
    <pre
      className="bg-gray-100 rounded-md p-4 mb-4 overflow-x-auto"
      {...props}
    />
  ),
  em: (props) => <em className="italic" {...props} />,
  strong: (props) => <strong className="font-bold" {...props} />,
  hr: () => <hr className="my-6 border-t border-gray-300" />,
  table: (props) => (
    <div className="overflow-x-auto mb-4">
      <table className="min-w-full border border-gray-300" {...props} />
    </div>
  ),
  th: (props) => (
    <th
      className="border border-gray-300 px-4 py-2 bg-gray-100 font-semibold"
      {...props}
    />
  ),
  td: (props) => <td className="border border-gray-300 px-4 py-2" {...props} />,
  tr: (props) => <tr className="even:bg-gray-50" {...props} />,
  img: (props) => (
    <img
      className="max-w-full h-auto my-4 rounded-md shadow-sm"
      alt={props.alt || "Image"}
      {...props}
    />
  ),
};

const SummaryViewPage = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const materialId = params.materialId;
  const summaryId = searchParams.get("summaryId");

  // Summary state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [showShareTooltip, setShowShareTooltip] = useState(false);

  // Fetch summary data
  useEffect(() => {
    const fetchSummaryData = async () => {
      if (!summaryId) {
        setError("No summary ID provided");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/summary/${summaryId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch summary: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.summary) {
          setSummary(data.summary);
        } else {
          throw new Error(data.error || "Failed to fetch summary data");
        }
      } catch (error) {
        console.error("Error fetching summary:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSummaryData();
  }, [summaryId]);
  const handleCopyToClipboard = () => {
    if (summary) {
      let contentToCopy = summary.content;
      
      // Include cultural example if it exists
      if (summary.example) {
        contentToCopy += '\n\n---\n\n## Cultural Context Example\n\n' + summary.example;
      }
      
      navigator.clipboard
        .writeText(contentToCopy)
        .then(() => {
          toast({
            title: "Copied to clipboard!",
            description: "Summary content has been copied to your clipboard.",
            variant: "success",
          });
        })
        .catch((err) => {
          console.error("Could not copy text: ", err);
          toast({
            title: "Failed to copy",
            description: "Could not copy text to clipboard.",
            variant: "destructive",
          });
        });
    }
  };
  const handleDownload = () => {
    if (!summary) return;

    // Create filename from summary title
    const filename = `${summary.title
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()}.md`;

    // Create content with cultural example if it exists
    let contentToDownload = summary.content;
    if (summary.example) {
      contentToDownload += '\n\n---\n\n## Cultural Context Example\n\n' + summary.example;
    }

    // Create a blob with the content
    const blob = new Blob([contentToDownload], { type: "text/markdown" });

    // Create a temporary URL for the blob
    const url = URL.createObjectURL(blob);

    // Create a link element
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;

    // Append to the document, click it, and remove it
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Revoke the URL to free up memory
    URL.revokeObjectURL(url);

    toast({
      title: "Download started",
      description: `Downloading summary as ${filename}`,
      variant: "success",
    });
  };

  const handleShare = async () => {
    // Generate a shareable URL to this summary
    const shareUrl = `${window.location.origin}/summary/${materialId}/view?summaryId=${summaryId}`;

    // Check if the Web Share API is available
    if (navigator.share) {
      try {
        await navigator.share({
          title: summary?.title || "Study Summary",
          text: `Check out this summary: ${summary?.title}`,
          url: shareUrl,
        });

        toast({
          title: "Shared successfully",
          description: "The summary has been shared.",
          variant: "success",
        });
      } catch (error) {
        console.error("Error sharing:", error);
        // Fallback to clipboard copy if sharing fails
        handleShareFallback(shareUrl);
      }
    } else {
      // Fallback for browsers that don't support the Web Share API
      handleShareFallback(shareUrl);
    }
  };

  const handleShareFallback = (shareUrl) => {
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        setShowShareTooltip(true);

        toast({
          title: "Link copied to clipboard!",
          description: "Share this link with others to view this summary.",
          action: (
            <ToastAction altText="Copy link">
              <Button
                variant="outline"
                size="sm"
                className={"no-loading"}
                onClick={() => navigator.clipboard.writeText(shareUrl)}
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
            </ToastAction>
          ),
        });

        setTimeout(() => setShowShareTooltip(false), 3000);
      })
      .catch((err) => {
        console.error("Could not copy link: ", err);
        toast({
          title: "Failed to copy link",
          description: "Could not copy sharing link to clipboard.",
          variant: "destructive",
        });
      });
  };

  const handlePrint = () => {
    window.print();
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <Loader className="h-12 w-12 text-rose-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-800">
            Loading summary...
          </h2>
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
            Error Loading Summary
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button
            onClick={() => router.push(`/materials/${materialId}`)}
            className="bg-gradient-to-r from-rose-600 to-pink-600 text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Material
          </Button>
        </div>
      </div>
    );
  }

  // If no summary found
  if (!summary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <HelpCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-800 mb-2">
            Summary Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            The summary you're looking for could not be found.
          </p>
          <Button
            onClick={() => router.push(`/materials/${materialId}`)}
            className="bg-gradient-to-r from-rose-600 to-pink-600 text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Material
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col p-6 md:p-10">
      <div className="max-w-4xl w-full mx-auto print:max-w-none print:w-full">
        {/* Back button - hide when printing */}
        <Button
          variant="ghost"
          onClick={() => router.push(`/summary/${materialId}/list`)}
          className="mb-6 text-gray-600 hover:text-gray-900 hover:bg-gray-100 print:hidden"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Summary List
        </Button>

        {/* Summary header - keep when printing */}
        <div className="mb-6 print:mb-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 print:text-2xl">
                {summary.title}
              </h1>
              <p className="text-gray-600">
                Summary for{" "}
                <span className="font-medium">{summary.material?.title}</span>
              </p>
            </div>
            <div className="md:text-right print:hidden">
              <div className="text-sm text-gray-600">
                Created:{" "}
                {new Date(summary.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons - hide when printing */}
        <div className="mb-6 flex flex-wrap gap-3 print:hidden">
          <Button
            variant="outline"
            onClick={handleCopyToClipboard}
            className="flex items-center gap-2 no-loading"
          >
            <Copy className="h-4 w-4" />
            Copy
          </Button>
          <Button
            variant="outline"
            onClick={handlePrint}
            className="flex items-center gap-2 no-loading"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2 no-loading"
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4" />
            {showShareTooltip ? (
              <>
                <Check className="h-3 w-3 mr-1" />
                Link Copied!
              </>
            ) : (
              "Share"
            )}
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2 no-loading"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>        {/* Summary content card */}
        <Card className="bg-white shadow-md mb-8 print:shadow-none print:border-0">
          <CardContent className="p-8 print:p-0">
            <div className="prose max-w-none">
              <ReactMarkdown
                components={MarkdownComponents}
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
              >
                {summary.content}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>

        {/* Cultural Example section - only show if example exists */}
        {summary.example && (
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 shadow-md mb-8 print:shadow-none print:border-0">
            <CardHeader>
              <CardTitle className="flex items-center text-amber-800">
                <Sparkles className="h-5 w-5 mr-2" />
                Cultural Context Example
              </CardTitle>
              <CardDescription className="text-amber-700">
                A practical example rooted in Qatari/GCC culture to illustrate the key concepts
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 print:p-0">
              <div 
                className="prose max-w-none"
                style={{
                  direction: isArabicText(summary.example) ? 'rtl' : 'ltr',
                  textAlign: isArabicText(summary.example) ? 'right' : 'left'
                }}
              >
                <ReactMarkdown
                  components={MarkdownComponents}
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                >
                  {summary.example}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SummaryViewPage;
