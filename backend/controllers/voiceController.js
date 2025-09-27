// backend/controllers/voiceController.js (ORIGINAL LENIENT VERSION)
import voiceService from '../services/voiceService.js';
import llmService from '../services/llmService.js';

class VoiceController {
  /**
   * Process voice input during onboarding (ORIGINAL WORKING VERSION)
   */
  async processOnboarding(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No audio file provided'
        });
      }

      const { userId, currentField, sessionData } = req.body;
      const audioFilePath = req.file.path;

      console.log(`🎤 Processing onboarding audio for field: ${currentField}, userId: ${userId}`);

      // Validate audio file
      const validation = voiceService.validateAudioFile(req.file);
      if (!validation.valid) {
        await voiceService.cleanupAudioFile(audioFilePath);
        return res.status(400).json({
          success: false,
          message: validation.error
        });
      }

      // Step 1: Transcribe audio
      const transcriptionResult = await voiceService.transcribeAudio(audioFilePath);
      
      if (!transcriptionResult.success) {
        await voiceService.cleanupAudioFile(audioFilePath);
        return res.status(400).json({
          success: false,
          message: transcriptionResult.error,
          details: transcriptionResult.details
        });
      }

      const transcript = transcriptionResult.transcript;
      console.log(`📝 Transcript for ${currentField}:`, transcript);

      // Step 2: Extract structured data with Gemini
      const extractionResult = await llmService.extractOnboardingData(transcript, currentField);
      
      if (!extractionResult.success) {
        await voiceService.cleanupAudioFile(audioFilePath);
        return res.status(400).json({
          success: false,
          message: extractionResult.error
        });
      }

      // Step 3: Determine next field
      const nextField = this.getNextOnboardingField(currentField);

      // Step 4: Generate response
      const responseResult = await llmService.generateOnboardingResponse(
        { ...extractionResult, field: currentField }, 
        nextField
      );

      // Step 5: Calculate progress
      const progress = this.calculateOnboardingProgress(currentField);

      console.log('📊 Onboarding Progress:', {
        currentField,
        extractedValue: extractionResult.value,
        progress,
        nextField,
        isComplete: nextField === null
      });

      // Step 6: Emit via WebSocket
      const io = req.app.get('io');
      const eventData = {
        type: 'field-completed',
        field: currentField,
        transcript: transcript,
        extractedValue: extractionResult.value,
        response: responseResult.response,
        nextField: nextField,
        progress: progress,
        needsConfirmation: extractionResult.needsConfirmation,
        isComplete: nextField === null,
        timestamp: new Date()
      };

      console.log('📡 Emitting WebSocket event to userId:', userId);

      if (userId && io) {
        io.to(`user-${userId}`).emit('onboarding-progress', eventData);
        io.emit('onboarding-progress-global', { ...eventData, userId });
        console.log('✅ WebSocket events emitted successfully');
      }

      // Step 7: Cleanup and respond
      await voiceService.cleanupAudioFile(audioFilePath);

      const httpResponse = {
        success: true,
        transcript: transcript,
        extractedValue: extractionResult.value,
        confidence: extractionResult.confidence,
        needsConfirmation: extractionResult.needsConfirmation,
        response: responseResult.response,
        nextField: nextField,
        progress: progress,
        isComplete: nextField === null,
        timestamp: new Date()
      };

      res.json(httpResponse);

    } catch (error) {
      console.error('❌ Voice onboarding error:', error);
      
      if (req.file?.path) {
        await voiceService.cleanupAudioFile(req.file.path);
      }
      
      res.status(500).json({
        success: false,
        message: 'Voice processing failed',
        error: error.message
      });
    }
  }

  /**
   * Process voice navigation commands
   */
  async processNavigation(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No audio file provided'
        });
      }

      const { userId, pageContext, userProfile } = req.body;
      const audioFilePath = req.file.path;

      console.log('🎤 Processing navigation command for userId:', userId);

      const transcriptionResult = await voiceService.transcribeAudio(audioFilePath);
      
      if (!transcriptionResult.success) {
        await voiceService.cleanupAudioFile(audioFilePath);
        return res.status(400).json(transcriptionResult);
      }

      const transcript = transcriptionResult.transcript;
      console.log('📝 Navigation command:', transcript);

      const navigationResult = await llmService.processNavigationCommand(
        transcript,
        JSON.parse(pageContext || '{}'),
        JSON.parse(userProfile || '{}')
      );

      const io = req.app.get('io');
      const eventData = {
        type: 'voice-navigation',
        transcript: transcript,
        intent: navigationResult.intent,
        action: navigationResult.action,
        targetScheme: navigationResult.target_scheme,
        response: navigationResult.response,
        timestamp: new Date()
      };

      if (userId && io) {
        io.to(`user-${userId}`).emit('navigation-response', eventData);
        console.log('📡 Navigation response emitted to userId:', userId);
      }

      await voiceService.cleanupAudioFile(audioFilePath);

      res.json({
        success: true,
        transcript: transcript,
        intent: navigationResult.intent,
        action: navigationResult.action,
        targetScheme: navigationResult.target_scheme,
        response: navigationResult.response,
        confidence: transcriptionResult.confidence,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('❌ Voice navigation error:', error);
      
      if (req.file?.path) {
        await voiceService.cleanupAudioFile(req.file.path);
      }
      
      res.status(500).json({
        success: false,
        message: 'Voice navigation failed',
        error: error.message
      });
    }
  }

  /**
   * Process scheme-specific voice commands
   */
  async processSchemeNavigation(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No audio file provided'
        });
      }

      const { userId, schemeData, userProfile } = req.body;
      const audioFilePath = req.file.path;

      console.log('🎤 Processing scheme navigation command for userId:', userId);

      const validation = voiceService.validateAudioFile(req.file);
      if (!validation.valid) {
        await voiceService.cleanupAudioFile(audioFilePath);
        return res.status(400).json({
          success: false,
          message: validation.error
        });
      }

      const transcriptionResult = await voiceService.transcribeAudio(audioFilePath);
      
      if (!transcriptionResult.success) {
        await voiceService.cleanupAudioFile(audioFilePath);
        return res.status(400).json({
          success: false,
          message: transcriptionResult.error
        });
      }

      const transcript = transcriptionResult.transcript;
      console.log('📝 Scheme navigation command:', transcript);

      const navigationResult = await llmService.processSchemeNavigation(
        transcript,
        JSON.parse(schemeData || '{}'),
        JSON.parse(userProfile || '{}')
      );

      console.log('🧭 Scheme navigation result:', navigationResult);

      const io = req.app.get('io');
      const eventData = {
        type: 'scheme-navigation',
        transcript: transcript,
        intent: navigationResult.intent,
        action: navigationResult.action,
        response: navigationResult.response,
        specificInfo: navigationResult.specific_info,
        timestamp: new Date()
      };

      if (userId && io) {
        io.to(`user-${userId}`).emit('scheme-navigation-response', eventData);
        console.log('📡 Scheme navigation response emitted to userId:', userId);
      }

      await voiceService.cleanupAudioFile(audioFilePath);

      res.json({
        success: true,
        transcript: transcript,
        intent: navigationResult.intent,
        action: navigationResult.action,
        response: navigationResult.response,
        specificInfo: navigationResult.specific_info,
        confidence: transcriptionResult.confidence,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('❌ Scheme navigation error:', error);
      
      if (req.file?.path) {
        await voiceService.cleanupAudioFile(req.file.path);
      }
      
      res.status(500).json({
        success: false,
        message: 'Scheme navigation failed',
        error: error.message
      });
    }
  }

  /**
   * Health check for voice service
   */
  async healthCheck(req, res) {
    try {
      const services = {
        elevenlabs: !!process.env.ELEVENLABS_API_KEY,
        gemini: !!process.env.GEMINI_API_KEY,
      };

      let elevenLabsStatus = 'Not configured';
      if (services.elevenlabs) {
        try {
          const testResult = await voiceService.testConnection();
          elevenLabsStatus = testResult.success ? 'Connected' : `Error: ${testResult.error}`;
        } catch (e) {
          elevenLabsStatus = 'Connection failed';
        }
      }

      res.json({
        success: true,
        message: 'Voice service health check - Phase 1 Complete',
        services,
        elevenLabsStatus,
        features: {
          onboardingVoice: true,
          navigationVoice: true,
          schemeNavigation: true,
          webSocketRealTime: true
        },
        timestamp: new Date(),
        uptime: process.uptime()
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Voice service health check failed',
        error: error.message
      });
    }
  }

  /**
   * Get next field in onboarding sequence
   */
  getNextOnboardingField(currentField) {
    const sequence = ['name', 'dob', 'location', 'income', 'family_size', 'occupation', 'documents'];
    const currentIndex = sequence.indexOf(currentField);
    
    return currentIndex >= 0 && currentIndex < sequence.length - 1
      ? sequence[currentIndex + 1]
      : null;
  }

  /**
   * Calculate progress percentage
   */
  calculateOnboardingProgress(currentField) {
    const sequence = ['name', 'dob', 'location', 'income', 'family_size', 'occupation', 'documents'];
    const currentIndex = sequence.indexOf(currentField);
    
    if (currentIndex === -1) return 0;
    return Math.round(((currentIndex + 1) / sequence.length) * 100);
  }
}

export default new VoiceController();
