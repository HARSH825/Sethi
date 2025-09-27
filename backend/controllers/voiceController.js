// backend/controllers/voiceController.js (COMPLETE UPDATED FILE)
import voiceService from '../services/voiceService.js';
import llmService from '../services/llmService.js';

class VoiceController {
  /**
   * Process voice input during onboarding (COMPLETE WITH VALIDATION)
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
      
      console.log(`🔍 Extraction result:`, {
        success: extractionResult.success,
        confidence: extractionResult.confidence,
        needsConfirmation: extractionResult.needsConfirmation,
        value: extractionResult.value
      });

      // CRITICAL FIX: Check if extraction failed or confidence is too low
      if (!extractionResult.success) {
        await voiceService.cleanupAudioFile(audioFilePath);
        
        const retryResponse = await llmService.generateRetryResponse(currentField, transcript);
        
        // Emit WebSocket event for retry (DO NOT ADVANCE)
        const io = req.app.get('io');
        const eventData = {
          type: 'extraction-failed',
          field: currentField,
          transcript: transcript,
          response: retryResponse.response,
          nextField: currentField, // SAME FIELD - DON'T ADVANCE
          progress: this.calculateOnboardingProgress(currentField) - 14, // Don't increase progress
          needsConfirmation: true,
          isComplete: false,
          timestamp: new Date()
        };

        if (userId && io) {
          io.to(`user-${userId}`).emit('onboarding-progress', eventData);
        }

        return res.json({
          success: false, // CRITICAL: Mark as failed
          transcript: transcript,
          extractedValue: null,
          confidence: extractionResult.confidence || 0,
          needsConfirmation: true,
          response: retryResponse.response,
          nextField: currentField, // SAME FIELD
          progress: this.calculateOnboardingProgress(currentField) - 14, // Don't advance progress
          isComplete: false,
          shouldRetry: true, // Flag to indicate retry needed
          timestamp: new Date()
        });
      }

      // CRITICAL FIX: Check confidence threshold
      const CONFIDENCE_THRESHOLD = 0.7; // 70% confidence required
      if (extractionResult.confidence < CONFIDENCE_THRESHOLD || extractionResult.needsConfirmation) {
        console.log(`⚠️ Low confidence (${extractionResult.confidence}) or needs confirmation for field: ${currentField}`);
        
        await voiceService.cleanupAudioFile(audioFilePath);
        
        const confirmationResponse = await llmService.generateConfirmationRequest(
          currentField, 
          extractionResult.value, 
          extractionResult.confidence
        );
        
        // Emit WebSocket event for confirmation (DO NOT ADVANCE)
        const io = req.app.get('io');
        const eventData = {
          type: 'confirmation-needed',
          field: currentField,
          transcript: transcript,
          extractedValue: extractionResult.value,
          response: confirmationResponse.response,
          nextField: currentField, // SAME FIELD - DON'T ADVANCE
          progress: this.calculateOnboardingProgress(currentField) - 14, // Don't increase progress  
          needsConfirmation: true,
          confidence: extractionResult.confidence,
          isComplete: false,
          timestamp: new Date()
        };

        if (userId && io) {
          io.to(`user-${userId}`).emit('onboarding-progress', eventData);
        }

        return res.json({
          success: false, // CRITICAL: Mark as failed for low confidence
          transcript: transcript,
          extractedValue: extractionResult.value,
          confidence: extractionResult.confidence,
          needsConfirmation: true,
          response: confirmationResponse.response,
          nextField: currentField, // SAME FIELD
          progress: this.calculateOnboardingProgress(currentField) - 14, // Don't advance
          isComplete: false,
          shouldRetry: true,
          timestamp: new Date()
        });
      }

      // ONLY ADVANCE IF EXTRACTION IS SUCCESSFUL AND CONFIDENT
      console.log(`✅ Successful extraction for ${currentField}: ${extractionResult.value}`);

      // Step 3: Determine next field (only if current extraction succeeded)
      const nextField = this.getNextOnboardingField(currentField);

      // Step 4: Generate success response
      const responseResult = await llmService.generateOnboardingResponse(
        { ...extractionResult, field: currentField }, 
        nextField
      );

      // Step 5: Calculate progress (only advance if successful)
      const progress = this.calculateOnboardingProgress(currentField);

      console.log('📊 Successful Onboarding Progress:', {
        currentField,
        extractedValue: extractionResult.value,
        progress,
        nextField,
        isComplete: nextField === null
      });

      // Step 6: Emit via WebSocket (SUCCESS)
      const io = req.app.get('io');
      const eventData = {
        type: 'field-completed',
        field: currentField,
        transcript: transcript,
        extractedValue: extractionResult.value,
        response: responseResult.response,
        nextField: nextField,
        progress: progress,
        needsConfirmation: false,
        isComplete: nextField === null,
        timestamp: new Date()
      };

      console.log('📡 Emitting SUCCESS WebSocket event to userId:', userId);

      if (userId && io) {
        io.to(`user-${userId}`).emit('onboarding-progress', eventData);
        io.emit('onboarding-progress-global', { ...eventData, userId });
        console.log('✅ SUCCESS WebSocket events emitted');
      }

      // Step 7: Cleanup and respond
      await voiceService.cleanupAudioFile(audioFilePath);

      const httpResponse = {
        success: true,
        transcript: transcript,
        extractedValue: extractionResult.value,
        confidence: extractionResult.confidence,
        needsConfirmation: false,
        response: responseResult.response,
        nextField: nextField,
        progress: progress,
        isComplete: nextField === null,
        shouldRetry: false,
        timestamp: new Date()
      };

      console.log('📤 Sending SUCCESS HTTP response');
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
   * Process voice navigation commands (ENHANCED FOR PHASE 1)
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
   * Process scheme-specific voice commands (PHASE 1 ENHANCEMENT)
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
        message: 'Voice service health check - Phase 1 Complete with Validation',
        services,
        elevenLabsStatus,
        features: {
          onboardingVoice: true,
          navigationVoice: true,
          schemeNavigation: true,
          webSocketRealTime: true,
          validationLogic: true,
          confidenceThreshold: true,
          retryMechanism: true
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
