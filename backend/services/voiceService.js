// backend/services/voiceService.js (FIXED VERSION)
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { Readable } from 'stream';

class VoiceService {
  constructor() {
    this.elevenLabsApiKey = "sk_c672fa8249c6553527cd832fae1a475ed5fb9386c5e9299d";
    this.elevenLabsBaseUrl = 'https://api.elevenlabs.io/v1';
    
    if (!this.elevenLabsApiKey) {
      console.warn('⚠️ ElevenLabs API key not found');
    }
  }

  /**
   * Transcribe audio using ElevenLabs Speech-to-Text (FIXED VERSION)
   */
  async transcribeAudio(audioFilePath) {
    try {
      if (!fs.existsSync(audioFilePath)) {
        throw new Error('Audio file not found');
      }

      console.log('🎤 Transcribing audio with ElevenLabs...');
      console.log("🔑 API Key:", this.elevenLabsApiKey);

      // Read the file buffer
      const fileBuffer = fs.readFileSync(audioFilePath);
      
      if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error("No file buffer received");
      }

      const formData = new FormData();
      
      // Use the correct model ID
      formData.append('model_id', 'scribe_v1');
      
      // Create a readable stream from the buffer
      const stream = Readable.from(fileBuffer);
      
      // Append file with proper metadata
      formData.append('file', stream, {
        filename: 'audio.webm',
        contentType: 'audio/webm'
      });

      // FIXED: Build headers properly - FormData headers first, then our API key
      const headers = {
        ...formData.getHeaders(),  // Get content-type and boundary first
        'xi-api-key': this.elevenLabsApiKey  // Then add our API key (this will override any conflicts)
      };

      console.log('📤 Final headers:', headers);

      // Make request with correct URL and parameters
      const response = await axios.post(
        `${this.elevenLabsBaseUrl}/speech-to-text?language_code=eng&num_speakers=1`,
        formData,
        {
          headers,
          timeout: 30000
        }
      );

      const result = {
        success: true,
        transcript: response.data.text || '',
        confidence: 0.9,
        duration: response.data.duration || 0
      };

      console.log('📝 Transcription successful:', result.transcript);
      return result;

    } catch (error) {
      console.error('❌ ElevenLabs transcription error:', error.response?.data || error.message);
      
      return {
        success: false,
        error: 'Speech recognition failed. Please try speaking clearly.',
        details: error.response?.data?.detail || error.message,
        transcript: '',
        confidence: 0
      };
    }
  }

  /**
   * Alternative transcription method that works with multer files directly
   */
  async transcribeMulterFile(multerFile) {
    try {
      if (!multerFile || !multerFile.buffer) {
        throw new Error("No file or buffer received");
      }

      console.log('🎤 Transcribing multer file with ElevenLabs...');

      const formData = new FormData();
      formData.append('model_id', 'scribe_v1');
      
      const stream = Readable.from(multerFile.buffer);
      
      formData.append('file', stream, {
        filename: multerFile.originalname || 'audio.webm',
        contentType: multerFile.mimetype || 'audio/webm'
      });

      // FIXED: Same header fix here
      const headers = {
        ...formData.getHeaders(),
        'xi-api-key': this.elevenLabsApiKey
      };

      const response = await axios.post(
        `${this.elevenLabsBaseUrl}/speech-to-text?language_code=eng&num_speakers=1`,
        formData,
        {
          headers,
          timeout: 30000
        }
      );

      return {
        success: true,
        transcript: response.data.text || '',
        confidence: 0.9,
        duration: response.data.duration || 0
      };

    } catch (error) {
      console.error('❌ ElevenLabs transcription error:', error.response?.data || error.message);
      
      return {
        success: false,
        error: 'Speech recognition failed. Please try speaking clearly.',
        details: error.response?.data?.detail || error.message,
        transcript: '',
        confidence: 0
      };
    }
  }

  /**
   * Clean up uploaded audio file
   */
  async cleanupAudioFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('🗑️ Audio file cleaned up:', filePath);
      }
    } catch (error) {
      console.error('⚠️ File cleanup error:', error.message);
    }
  }

  /**
   * Validate audio file format and size
   */
  validateAudioFile(file) {
    const allowedTypes = [
      'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/mp4', 
      'audio/ogg', 'audio/webm', 'application/octet-stream'
    ];
    
    const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: 'Invalid file type. Please upload audio files only.'
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB.`
      };
    }

    return { valid: true };
  }
}

export default new VoiceService();
