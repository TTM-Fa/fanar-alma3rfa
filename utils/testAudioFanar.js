import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Replace with your actual Bearer token
const BEARER_TOKEN = 'fmFrMl3wHnB9SFnb8bzxNFpGCVE18Wcz';

const createSpeech = async () => {
  const url = 'https://api.fanar.qa/v1/audio/speech';

  const data = {
    model: 'Fanar-Aura-TTS-1',
    input: 'Hello! I hope you are having a wonderful day.',
    voice: 'default'
  };

  try {
    const response = await axios.post(url, data, {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`,
        'Content-Type': 'application/json'
      },
      responseType: 'arraybuffer' // Important: tells axios to treat the response as binary
    });

    const outputPath = path.join('./', 'output.mp3');
    fs.writeFileSync(outputPath, response.data);
    console.log('Audio saved to', outputPath);
  } catch (error) {
    console.error('Error generating speech:', error.response ? error.response.data : error.message);
  }
};

createSpeech();
