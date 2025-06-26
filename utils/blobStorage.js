import { put } from '@vercel/blob';

/**
 * Upload a base64 image to Vercel Blob storage
 * @param {string} base64Data - Base64 image data (without data:image/png;base64, prefix)
 * @param {string} filename - Filename for the blob (should include extension)
 * @returns {Promise<string>} - URL of the uploaded image
 */
export async function uploadImageToBlob(base64Data, filename) {
  try {
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Upload to Vercel Blob with explicit token
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: 'image/png',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    
    return blob.url;
  } catch (error) {
    console.error('Error uploading image to blob storage:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
}

/**
 * Generate a unique filename for a flashcard image
 * @param {string} deckId - Flashcard deck ID
 * @param {number} cardIndex - Card index in the deck
 * @returns {string} - Unique filename
 */
export function generateImageFilename(deckId, cardIndex) {
  const timestamp = Date.now();
  return `flashcards/${deckId}/card-${cardIndex}-${timestamp}.png`;
}
