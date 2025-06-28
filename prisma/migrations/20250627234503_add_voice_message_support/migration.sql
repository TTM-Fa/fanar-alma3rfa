-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "audioUrl" TEXT,
ADD COLUMN     "messageType" TEXT NOT NULL DEFAULT 'text',
ADD COLUMN     "transcription" TEXT;
