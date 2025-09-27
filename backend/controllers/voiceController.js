// backend/controllers/voiceController.js (UPDATE processOnboarding method)

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
