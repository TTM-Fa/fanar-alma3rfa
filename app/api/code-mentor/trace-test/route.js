import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Trace API is working",
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req) {
  try {
    console.log("=== TRACE API TEST ===");

    const { code, lang = "English" } = await req.json();

    // Return a mock response to test the frontend
    const mockResponse = {
      headers: ["Step", "Statement", "Variables", "Output"],
      traceSteps: [
        {
          step: 1,
          statement: "x = 5",
          variables: "x: 5",
          output: "",
        },
        {
          step: 2,
          statement: "y = x + 3",
          variables: "x: 5, y: 8",
          output: "",
        },
        {
          step: 3,
          statement: "print(y)",
          variables: "x: 5, y: 8",
          output: "8",
        },
      ],
    };

    console.log("Returning mock response:", mockResponse);
    return NextResponse.json(mockResponse);
  } catch (error) {
    console.error("Test API error:", error);
    return NextResponse.json(
      { error: "Test failed: " + error.message },
      { status: 500 }
    );
  }
}
