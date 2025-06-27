-- CreateTable
CREATE TABLE "CodeMentor" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "code" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'python',
    "materialId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodeMentor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeAnalysis" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'English',
    "codeMentorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodeAnalysis_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CodeMentor" ADD CONSTRAINT "CodeMentor_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeAnalysis" ADD CONSTRAINT "CodeAnalysis_codeMentorId_fkey" FOREIGN KEY ("codeMentorId") REFERENCES "CodeMentor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
