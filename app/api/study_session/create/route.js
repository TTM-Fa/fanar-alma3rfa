import { prisma } from "@/utils/database";

export const POST = async (req) => {
  const { title, description, subject } = await req.json();
  const studySession = {
    title,
    description,
    subject,
  };
  console.log("Creating study session:", studySession);

  if (!title || !description || !subject) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Missing required fields (title, description, subject)",
      }),
      { status: 400 }
    );
  }

  try {
    const dbResult = await prisma.studySession.create({
      data: studySession,
    });

    console.log("Study session created successfully");
    return new Response(
      JSON.stringify({
        success: true,
        data: dbResult,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("An error occurred while creating study session:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "A server error occurred while creating the study session.",
      }),
      { status: 500 }
    );
  }
};
