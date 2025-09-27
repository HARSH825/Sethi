// src/services/voiceService.ts (COMPLETE FIXED VERSION - VOICE SELECTION FIXED)
import { VoiceProcessingResult } from '@/types';

interface VoiceContext {
  userId?: string;
  type?: 'onboarding' | 'navigation' | 'scheme';
  currentField?: string;
  sessionData?: Record<string, any>;
}

interface SpeechOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
}

class VoiceService {
  private isRecording = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private voicesInitialized = false;

  async initializeMicrophone(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      console.log('🎤 Microphone initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Microphone access denied:', error);
      return false;
    }
  }
// Add this method to voiceService.ts to handle form field processing specifically:

// Add this method inside the VoiceService class:
// Update the processFormFieldAudio method in your frontend voiceService.ts:

async processFormFieldAudio(audioBlob: Blob, fieldData: {
  fieldId: string;
  fieldLabel: string;
  fieldType: string;
  schemeTitle: string;
  userId: string;
}): Promise<VoiceProcessingResult> {
  const formData = new FormData();
  formData.append('audio', audioBlob);
  formData.append('userId', fieldData.userId);
  formData.append('fieldId', fieldData.fieldId);
  formData.append('fieldLabel', fieldData.fieldLabel);
  formData.append('fieldType', fieldData.fieldType);
  formData.append('schemeTitle', fieldData.schemeTitle);
  formData.append('expectingValue', 'true');

  try {
    console.log('🎤 Processing form field audio:', fieldData.fieldLabel);
    
    // FIXED: Use the correct endpoint
    const response = await fetch('http://localhost:3001/api/voice/process-form-field', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('📝 Form field processing result:', result);

    return {
      success: result.success,
      response: result.response || result.extractedValue,
      confidence: result.confidence || 0.8,
      timestamp: new Date()
    };

  } catch (error) {
    console.error('❌ Form field processing failed:', error);
    return {
      success: false,
      response: 'Processing failed',
      confidence: 0,
      timestamp: new Date()
    };
  }
}


// Local fallback processing for form fields
private async processFormFieldLocally(audioBlob: Blob, fieldData: {
  fieldId: string;
  fieldLabel: string;
  fieldType: string;
  schemeTitle: string;
  userId: string;
}): Promise<VoiceProcessingResult> {
  console.log('🔄 Using local form field processing for:', fieldData.fieldLabel);
  
  // For demo purposes, we'll use speech recognition API if available
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    try {
      const transcript = await this.speechToText(audioBlob);
      let processedValue = transcript.trim();
      
      // Clean up the transcript for form fields
      processedValue = processedValue
        .replace(/^(background noise|noise)/i, '')
        .replace(/[.,!?]$/, '') // Remove punctuation
        .trim();

      // Field-specific processing
      if (fieldData.fieldType === 'number') {
        const numbers = processedValue.match(/\d+/g);
        if (numbers) {
          processedValue = numbers.join('');
        }
      }

      return {
        success: true,
        response: processedValue,
        confidence: 0.8,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Speech recognition failed:', error);
    }
  }

  // Ultimate fallback - return cleaned input
  return {
    success: true,
    response: 'Unable to process audio',
    confidence: 0.3,
    timestamp: new Date()
  };
}

// Helper method for speech to text
private async speechToText(audioBlob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      reject(new Error('Speech recognition not supported'));
      return;
    }

    // Convert blob to audio for recognition (simplified approach)
    const audio = new Audio(URL.createObjectURL(audioBlob));
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      resolve(transcript);
    };

    recognition.onerror = (event: any) => {
      reject(new Error(`Speech recognition error: ${event.error}`));
    };

    // This is a simplified approach - in a real implementation,
    // you'd need to properly feed the audio to the recognition service
    recognition.start();
    
    // Timeout after 5 seconds
    setTimeout(() => {
      recognition.stop();
      reject(new Error('Speech recognition timeout'));
    }, 5000);
  });
}

  async startRecording(): Promise<void> {
    if (this.isRecording) return;

    if (!this.stream) {
      const hasPermission = await this.initializeMicrophone();
      if (!hasPermission) {
        throw new Error('Microphone permission required');
      }
    }

    this.audioChunks = [];
    this.mediaRecorder = new MediaRecorder(this.stream!, {
      mimeType: 'audio/webm;codecs=opus'
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start();
    this.isRecording = true;
    console.log('🎙️ Recording started');
  }

  async stopRecording(): Promise<Blob | null> {
    if (!this.isRecording || !this.mediaRecorder) return null;

    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.isRecording = false;
        console.log('⏹️ Recording stopped, size:', audioBlob.size);
        resolve(audioBlob);
      };

      this.mediaRecorder!.stop();
    });
  }

  async processAudio(audioBlob: Blob, context: VoiceContext = {}): Promise<VoiceProcessingResult> {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('userId', context.userId || 'anonymous');
    formData.append('currentField', context.currentField || '');
    formData.append('sessionData', JSON.stringify(context.sessionData || {}));

    const endpoint = context.type === 'onboarding' 
      ? '/api/voice/process-onboarding'
      : '/api/voice/process-navigation';

    try {
      console.log('📤 Sending audio to:', endpoint);
      const response = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      console.log('🎯 Voice processing result:', result);
      return {
        ...result,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('❌ Voice processing failed:', error);
      return {
        success: false,
        response: 'Voice processing failed. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  async processSchemeAudio(audioBlob: Blob, schemeData: any, userProfile: any, userId: string): Promise<VoiceProcessingResult> {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('userId', userId);
    
    // Ensure we always send valid data
    const safeSchemeData = schemeData || {
      title: 'Government Scheme',
      benefitAmount: 0,
      requiredDocuments: []
    };
    
    const safeUserProfile = userProfile || {
      name: 'User',
      attributes: { income: null, age: null, occupation: null },
      address: { state: null }
    };

    formData.append('schemeData', JSON.stringify(safeSchemeData));
    formData.append('userProfile', JSON.stringify(safeUserProfile));

    try {
      console.log('📤 Sending scheme audio question:', {
        schemeTitle: safeSchemeData.title,
        userName: safeUserProfile.name,
        userId
      });

      const response = await fetch('http://localhost:3001/api/voice/process-scheme-navigation', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      console.log('🎯 Scheme voice processing result:', result);
      
      return {
        ...result,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('❌ Scheme voice processing failed:', error);
      return {
        success: false,
        response: 'I had trouble processing your question about this scheme. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  async initializeVoices(): Promise<void> {
    if (this.voicesInitialized) return;

    return new Promise((resolve) => {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          console.log('🔊 Voices loaded:', voices.length);
          console.log('🎭 Available voices:', voices.map(v => ({ name: v.name, lang: v.lang })));
          this.voicesInitialized = true;
          resolve();
        } else {
          setTimeout(loadVoices, 100);
        }
      };

      if (window.speechSynthesis.getVoices().length > 0) {
        this.voicesInitialized = true;
        resolve();
      } else {
        window.speechSynthesis.onvoiceschanged = loadVoices;
        loadVoices();
      }
    });
  }

  /**
   * COMPLETELY FIXED: Voice selection with strict English-only filtering
   */
  speak(text: string, options: SpeechOptions = {}): void {
    if (!text || !this.isSpeechSynthesisSupported()) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Improved voice settings for natural, fast speech
    utterance.rate = options.rate || 1.3; // Even faster
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;
    utterance.lang = options.lang || 'en-US'; // Force English

    // Get all available voices
    const voices = window.speechSynthesis.getVoices();
    console.log('🔊 Total voices available:', voices.length);

    // FIXED: Strict English-only voice filtering
    const englishVoices = voices.filter(voice => {
      const lang = voice.lang.toLowerCase();
      const name = voice.name.toLowerCase();
      
      // Must be English language
      const isEnglish = lang.startsWith('en-') || lang === 'en';
      
      // Must NOT be non-English languages (strict filtering)
      const isNotForeign = !lang.includes('es') && // No Spanish
                          !lang.includes('fr') && // No French
                          !lang.includes('de') && // No German
                          !lang.includes('it') && // No Italian
                          !lang.includes('pt') && // No Portuguese
                          !lang.includes('ru') && // No Russian
                          !lang.includes('zh') && // No Chinese
                          !lang.includes('ja') && // No Japanese
                          !lang.includes('ko') && // No Korean
                          !lang.includes('ar') && // No Arabic
                          !lang.includes('hi') && // No Hindi (for now)
                          !name.includes('spanish') &&
                          !name.includes('french') &&
                          !name.includes('german') &&
                          !name.includes('italian') &&
                          !name.includes('portuguese') &&
                          !name.includes('russian') &&
                          !name.includes('chinese') &&
                          !name.includes('arabic');
      
      return isEnglish && isNotForeign;
    });

    console.log('🇺🇸 English voices found:', englishVoices.length);
    console.log('🎭 English voices:', englishVoices.map(v => ({ name: v.name, lang: v.lang })));

    // Priority order for English voice selection (best to worst)
    const voicePreferences = [
      // US English female voices (most natural)
      'Microsoft Zira Desktop',
      'Microsoft Zira',
      'Google US English Female',
      'Samantha', // macOS female
      
      // US English male voices
      'Microsoft David Desktop',
      'Microsoft Mark',
      'Google US English Male',
      'Alex', // macOS male
      
      // UK English voices
      'Microsoft Hazel Desktop',
      'Google UK English Female',
      'Google UK English Male',
      
      // Indian English voices (if available)
      'Microsoft Heera Desktop',
      'Google हिन्दी', // Only if it speaks English
      
      // Any other English voice as fallback
      'en-US', 'en-GB', 'en-IN', 'en-AU', 'en-CA'
    ];

    let selectedVoice = null;

    // Try to find preferred voices in order
    for (const preference of voicePreferences) {
      selectedVoice = englishVoices.find(voice => {
        // Exact name match
        if (voice.name === preference) return true;
        
        // Partial name match (case insensitive)
        if (voice.name.toLowerCase().includes(preference.toLowerCase())) return true;
        
        // Language code match
        if (voice.lang === preference) return true;
        
        return false;
      });
      
      if (selectedVoice) {
        console.log('🔊 Found preferred English voice:', selectedVoice.name, selectedVoice.lang);
        break;
      }
    }

    // Final fallback: any English voice
    if (!selectedVoice && englishVoices.length > 0) {
      selectedVoice = englishVoices[0];
      console.log('🔊 Using fallback English voice:', selectedVoice.name, selectedVoice.lang);
    }

    // Ultimate fallback: default system voice (force English)
    if (!selectedVoice) {
      console.warn('⚠️ No English voice found, using system default with en-US language');
      utterance.lang = 'en-US'; // Force English language
    } else {
      utterance.voice = selectedVoice;
      console.log('✅ Selected voice:', selectedVoice.name, '(' + selectedVoice.lang + ')');
    }

    // Event handlers
    utterance.onstart = () => console.log('🗣️ Saarthi speaking...', utterance.voice?.name || 'default');
    utterance.onend = () => console.log('🔇 Saarthi finished speaking');
    utterance.onerror = (e) => console.error('❌ TTS Error:', e);

    // Speak the text
    window.speechSynthesis.speak(utterance);
  }

  stopSpeaking(): void {
    window.speechSynthesis.cancel();
  }

  isSpeechSynthesisSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  getRecordingState(): boolean {
    return this.isRecording;
  }

  cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.isRecording && this.mediaRecorder) {
      this.mediaRecorder.stop();
    }
    window.speechSynthesis.cancel();
  }
}

export default new VoiceService();
