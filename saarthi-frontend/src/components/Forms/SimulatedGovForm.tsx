// src/components/Forms/SimulatedGovForm.tsx - FIXED VOICE SERVICE METHODS

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  User, Phone, Mail, MapPin, IndianRupee, Users, Briefcase, FileText, Bot,
  Mic, MicOff, Check, AlertCircle, Loader2, Volume2, Sparkles, Clock,
  MessageSquare, X, Square
} from 'lucide-react';
import voiceService from '@/services/voiceService';
import { UserProfile } from '@/types';

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'select' | 'textarea';
  required: boolean;
  autoFillable: boolean;
  value: string;
  filled: boolean;
  icon: React.ReactNode;
  options?: string[];
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
}

interface SimulatedGovFormProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: UserProfile | null;
  schemeTitle: string;
  schemeId: string;
}

interface FormAutomationState {
  step: 'idle' | 'auto-filling' | 'voice-input' | 'review' | 'submitted';
  currentFieldIndex: number;
  progress: number;
  filledFields: string[];
  errors: string[];
}

interface SaarthiState {
  status: string;
  step: 'ready' | 'filling' | 'voice-needed' | 'listening' | 'processing' | 'review' | 'success';
  currentAction: string;
  isActive: boolean;
}

// FIXED: Simple voice input state
interface VoiceInputState {
  isListening: boolean;
  isProcessing: boolean;
  currentField: string;
  transcript: string;
  error: string | null;
}

const SimulatedGovForm: React.FC<SimulatedGovFormProps> = ({
  isOpen, onClose, userProfile, schemeTitle, schemeId
}) => {
  // Form fields definition
  const [formFields, setFormFields] = useState<FormField[]>([
    {
      id: 'applicant_name',
      label: 'Applicant Full Name',
      type: 'text',
      required: true,
      autoFillable: true,
      value: '',
      filled: false,
      icon: <User className="w-4 h-4" />
    },
    {
      id: 'mobile_number',
      label: 'Mobile Number',
      type: 'tel',
      required: true,
      autoFillable: true,
      value: '',
      filled: false,
      icon: <Phone className="w-4 h-4" />,
      validation: { pattern: '^[6-9]\\d{9}$', minLength: 10, maxLength: 10 }
    },
    {
      id: 'email_address',
      label: 'Email Address',
      type: 'email',
      required: true,
      autoFillable: true,
      value: '',
      filled: false,
      icon: <Mail className="w-4 h-4" />
    },
    {
      id: 'state',
      label: 'State',
      type: 'select',
      required: true,
      autoFillable: true,
      value: '',
      filled: false,
      options: ['Delhi', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Gujarat', 'Rajasthan', 'West Bengal', 'Uttar Pradesh'],
      icon: <MapPin className="w-4 h-4" />
    },
    {
      id: 'district',
      label: 'District',
      type: 'text',
      required: true,
      autoFillable: true,
      value: '',
      filled: false,
      icon: <MapPin className="w-4 h-4" />
    },
    {
      id: 'pincode',
      label: 'PIN Code',
      type: 'text',
      required: true,
      autoFillable: true,
      value: '',
      filled: false,
      icon: <MapPin className="w-4 h-4" />,
      validation: { pattern: '^[1-9][0-9]{5}$', minLength: 6, maxLength: 6 }
    },
    {
      id: 'annual_income',
      label: 'Annual Income (₹)',
      type: 'number',
      required: true,
      autoFillable: true,
      value: '',
      filled: false,
      icon: <IndianRupee className="w-4 h-4" />,
      validation: { min: 0, max: 5000000 }
    },
    {
      id: 'occupation',
      label: 'Occupation',
      type: 'text',
      required: true,
      autoFillable: true,
      value: '',
      filled: false,
      icon: <Briefcase className="w-4 h-4" />
    },
    {
      id: 'family_members',
      label: 'Number of Family Members',
      type: 'number',
      required: true,
      autoFillable: true,
      value: '',
      filled: false,
      icon: <Users className="w-4 h-4" />,
      validation: { min: 1, max: 20 }
    },
    // UNKNOWN FIELDS - Require voice input
    {
      id: 'father_name',
      label: "Father's Name",
      type: 'text',
      required: true,
      autoFillable: false,
      value: '',
      filled: false,
      icon: <User className="w-4 h-4" />
    },
    {
      id: 'bank_name',
      label: 'Bank Name',
      type: 'text',
      required: true,
      autoFillable: false,
      value: '',
      filled: false,
      icon: <FileText className="w-4 h-4" />
    },
    {
      id: 'account_number',
      label: 'Bank Account Number',
      type: 'text',
      required: true,
      autoFillable: false,
      value: '',
      filled: false,
      icon: <FileText className="w-4 h-4" />,
      validation: { minLength: 9, maxLength: 18 }
    }
  ]);

  // Main state
  const [formState, setFormState] = useState<FormAutomationState>({
    step: 'idle',
    currentFieldIndex: 0,
    progress: 0,
    filledFields: [],
    errors: []
  });

  // FIXED: Simple voice state
  const [voiceState, setVoiceState] = useState<VoiceInputState>({
    isListening: false,
    isProcessing: false,
    currentField: '',
    transcript: '',
    error: null
  });

  // Saarthi sidebar state
  const [saarthiState, setSaarthiState] = useState<SaarthiState>({
    status: 'Ready to fill your application form automatically!',
    step: 'ready',
    currentAction: '',
    isActive: false
  });

  const [filledFieldsLog, setFilledFieldsLog] = useState<string[]>([]);
  const [currentFieldBeingFilled, setCurrentFieldBeingFilled] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  // Initialize voice service
  useEffect(() => {
    if (isOpen) {
      voiceService.initializeMicrophone().catch(console.error);
    }
  }, [isOpen]);

  // Start the auto-fill process
  const startAutoFill = async (): Promise<void> => {
    setFormState(prev => ({ ...prev, step: 'auto-filling' }));
    setSaarthiState(prev => ({
      ...prev,
      step: 'filling',
      status: 'Starting automatic form filling...',
      isActive: true
    }));
    setFilledFieldsLog([]);
    
    // Use voiceService.speak instead of await
    voiceService.speak('Starting automatic form filling!');
    
    // Start filling fields one by one
    await fillNextField(0);
  };

  // Fill the next available field
  const fillNextField = async (startIndex: number): Promise<void> => {
    for (let i = startIndex; i < formFields.length; i++) {
      const field = formFields[i];
      
      if (field.autoFillable && !field.filled) {
        // Auto-fill this field
        await new Promise(resolve => setTimeout(resolve, 1500));
        setFormState(prev => ({ ...prev, currentFieldIndex: i }));
        setCurrentFieldBeingFilled(field.label);
        
        const fillValue = getAutoFillValue(field, userProfile);
        
        // Update the form field
        setFormFields(prev => prev.map((f, index) =>
          index === i ? { ...f, value: fillValue, filled: true } : f
        ));
        
        // Update progress
        const newProgress = Math.round(((i + 1) / formFields.length) * 100);
        setFormState(prev => ({
          ...prev,
          progress: newProgress,
          filledFields: [...prev.filledFields, field.id]
        }));
        
        // Update logs
        const logMessage = `${field.label}: ${fillValue}`;
        setFilledFieldsLog(prev => [...prev, logMessage]);
        
        // Speak confirmation
        voiceService.speak(`Filled ${field.label}`);
        scrollToField(i);
        
      } else if (!field.autoFillable && !field.filled) {
        // Stop and request voice input
        setFormState(prev => ({ ...prev, step: 'voice-input', currentFieldIndex: i }));
        setCurrentFieldBeingFilled(field.label);
        setSaarthiState(prev => ({
          ...prev,
          step: 'voice-needed',
          status: `I need your ${field.label}. Please use Start/Stop buttons to provide this information.`
        }));
        
        voiceService.speak(`I need your ${field.label}. Please click Start to record.`);
        return; // Exit and wait for voice input
      }
    }
    
    // All fields processed
    completeForm();
  };

  // FIXED: Simple start voice recording using correct voiceService methods
  const startVoiceRecording = async (): Promise<void> => {
    const currentField = formFields[formState.currentFieldIndex];
    if (!currentField) return;

    try {
      setVoiceState({
        isListening: true,
        isProcessing: false,
        currentField: currentField.label,
        transcript: '',
        error: null
      });

      setSaarthiState(prev => ({
        ...prev,
        step: 'listening',
        status: `🎤 Recording ${currentField.label}... Click STOP when done.`
      }));

      console.log('🎤 Starting voice recording for:', currentField.label);
      
      // FIXED: Use the correct voiceService method
      await voiceService.startRecording();
      
    } catch (error) {
      console.error('❌ Voice recording failed:', error);
      setVoiceState(prev => ({
        ...prev,
        isListening: false,
        error: 'Voice recording failed. Please try again.'
      }));
      setSaarthiState(prev => ({
        ...prev,
        step: 'voice-needed',
        status: 'Recording failed. Please try again.'
      }));
    }
  };

  // FIXED: Simple stop voice recording using correct voiceService methods
  const stopVoiceRecording = async (): Promise<void> => {
    const currentField = formFields[formState.currentFieldIndex];
    if (!currentField) return;

    try {
      console.log('⏹️ Stopping voice recording');
      
      setVoiceState(prev => ({ ...prev, isListening: false, isProcessing: true }));
      setSaarthiState(prev => ({
        ...prev,
        step: 'processing',
        status: '🔄 Processing your voice input...'
      }));

      // FIXED: Use the correct voiceService method
      const audioBlob = await voiceService.stopRecording();
      
      if (audioBlob) {
        console.log('📹 Audio blob received, size:', audioBlob.size);
        await processVoiceInput(audioBlob, currentField);
      } else {
        throw new Error('No audio recorded');
      }
      
    } catch (error) {
      console.error('❌ Voice recording stop failed:', error);
      setVoiceState(prev => ({
        ...prev,
        isListening: false,
        isProcessing: false,
        error: 'Failed to process recording. Please try again.'
      }));
      setSaarthiState(prev => ({
        ...prev,
        step: 'voice-needed',
        status: 'Processing failed. Please try again.'
      }));
    }
  };

  // FIXED: Process voice input using audioBlob
  // FIXED: Update the processVoiceInput method in SimulatedGovForm.tsx
// Replace the processVoiceInput method with this corrected version:

// Replace the processVoiceInput method call with this:

const processVoiceInput = async (audioBlob: Blob, field: FormField): Promise<void> => {
  try {
    console.log('🔄 Processing voice input for field:', field.label);
    
    setVoiceState(prev => ({ ...prev, isProcessing: true }));
    setSaarthiState(prev => ({
      ...prev,
      step: 'processing',
      status: '🔄 Processing your voice input...'
    }));

    // FIXED: Use the dedicated form field processing method
    const result = await voiceService.processFormFieldAudio(audioBlob, {
      fieldId: field.id,
      fieldLabel: field.label,
      fieldType: field.type,
      schemeTitle: schemeTitle,
      userId: 'form-user'
    });

    if (result.success && result.response) {
      let processedValue = result.response.trim();
      
      // Clean up common artifacts
      processedValue = processedValue
        .replace(/^(background noise)/i, '')
        .replace(/[.,!?]$/, '')
        .trim();

      console.log('✅ Processed voice value:', processedValue);

      // Fill the field
      setFormFields(prev => prev.map((f, index) =>
        index === formState.currentFieldIndex ? 
        { ...f, value: processedValue, filled: true } : f
      ));

      // Update logs
      const logMessage = `${field.label}: ${processedValue} (Voice Input)`;
      setFilledFieldsLog(prev => [...prev, logMessage]);
      setVoiceState(prev => ({ ...prev, transcript: processedValue }));

      // Reset voice state after delay
      setTimeout(() => {
        setVoiceState({
          isListening: false,
          isProcessing: false,
          currentField: '',
          transcript: '',
          error: null
        });
      }, 2000);

      setSaarthiState(prev => ({
        ...prev,
        step: 'filling',
        status: `✅ Got ${field.label}: ${processedValue}`
      }));

      voiceService.speak(`Perfect! Got your ${field.label}: ${processedValue}`);

      // Continue after delay
      setTimeout(() => {
        continueAfterVoiceInput();
      }, 3000);

    } else {
      throw new Error(result.response || 'Voice processing failed');
    }

  } catch (error) {
    console.error('❌ Voice processing failed:', error);
    setVoiceState(prev => ({
      ...prev,
      isProcessing: false,
      error: 'Processing failed. Please try again.'
    }));
    setSaarthiState(prev => ({
      ...prev,
      step: 'voice-needed',
      status: 'Processing failed. Please try recording again.'
    }));
  }
};



  // Continue filling after voice input
  const continueAfterVoiceInput = async (): Promise<void> => {
    setSaarthiState(prev => ({
      ...prev,
      status: 'Continuing automatic form filling...'
    }));
    await fillNextField(formState.currentFieldIndex + 1);
  };

  // Complete the form filling
  const completeForm = (): void => {
    setFormState(prev => ({ ...prev, step: 'review', progress: 100 }));
    setSaarthiState(prev => ({
      ...prev,
      step: 'review',
      status: '🎉 Form completed! Please review and submit.'
    }));
    voiceService.speak('Form completed! Please review and submit.');
    
    if (formRef.current) {
      formRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle form submission
  const handleSubmit = (): void => {
    setFormState(prev => ({ ...prev, step: 'submitted' }));
    setSaarthiState(prev => ({
      ...prev,
      step: 'success',
      status: '🎉 Application submitted successfully!'
    }));
    voiceService.speak('Application submitted successfully!');
    
    setTimeout(() => {
      onClose();
    }, 5000);
  };

  // Utility functions
  const getAutoFillValue = (field: FormField, profile?: UserProfile | null): string => {
    if (!profile) return getDefaultValue(field.id);

    const attributes = profile.attributes || {};
    const location = profile.location || profile.address || {};
    
    switch (field.id) {
      case 'applicant_name':
        return profile.name || 'Harsh';
      case 'mobile_number':
        return profile.phone || '   ';
      case 'email_address':
        return profile.email || 'harsh@gmail.com';
      case 'state':
        return location.state || 'Maharashtra';
      case 'district':
        return location.district || 'Mumbai';
      case 'pincode':
        return location.pincode || '400058';
      case 'annual_income':
        const monthlyIncome = profile.income || attributes.income || 7000;
        return (monthlyIncome * 12).toString();
      case 'occupation':
        return profile.occupation || attributes.occupation || 'Farmer';
      case 'family_members':
        return (profile.family_size || attributes.family_size || 4).toString();
      default:
        return getDefaultValue(field.id);
    }
  };

  const getDefaultValue = (fieldId: string): string => {
    const defaults: Record<string, string> = {
      'applicant_name': 'राज कुमार शर्मा',
      'mobile_number': '9876543210',
      'email_address': 'raj.kumar@example.com',
      'state': 'Delhi',
      'district': 'South Delhi',
      'pincode': '110001',
      'annual_income': '540000',
      'occupation': 'Software Engineer',
      'family_members': '4'
    };
    return defaults[fieldId] || 'Auto-filled value';
  };

  const scrollToField = (fieldIndex: number): void => {
    const fieldElement = document.getElementById(`field-${fieldIndex}`);
    if (fieldElement) {
      fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const getFieldValidationError = (field: FormField): string | null => {
    if (!field.value && field.required) {
      return `${field.label} is required`;
    }
    
    if (field.validation && field.value) {
      const { pattern, minLength, maxLength, min, max } = field.validation;
      
      if (pattern && !new RegExp(pattern).test(field.value)) {
        return `${field.label} format is invalid`;
      }
      
      if (minLength && field.value.length < minLength) {
        return `${field.label} must be at least ${minLength} characters`;
      }
      
      if (maxLength && field.value.length > maxLength) {
        return `${field.label} must be at most ${maxLength} characters`;
      }
      
      if (field.type === 'number') {
        const numValue = parseInt(field.value);
        if (min && numValue < min) {
          return `${field.label} must be at least ${min}`;
        }
        if (max && numValue > max) {
          return `${field.label} must be at most ${max}`;
        }
      }
    }
    
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-start justify-center z-50 pt-4 pb-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-7xl h-[95vh] flex overflow-hidden">
        
        {/* Saarthi Sidebar - Always Visible */}
        <div className="w-80 bg-gradient-to-br from-blue-50 to-green-50 border-r border-gray-200 flex flex-col">
          
          {/* Saarthi Header */}
          <div className="p-4 bg-gradient-to-r from-blue-600 to-green-600 text-white">
            <div className="flex items-center mb-2">
              {saarthiState.step === 'filling' ? (
                <Bot className="w-6 h-6 mr-2 animate-pulse" />
              ) : saarthiState.step === 'listening' ? (
                <Mic className="w-6 h-6 mr-2 animate-pulse text-red-300" />
              ) : saarthiState.step === 'processing' ? (
                <Loader2 className="w-6 h-6 mr-2 animate-spin" />
              ) : saarthiState.step === 'success' ? (
                <Check className="w-6 h-6 mr-2 text-green-300" />
              ) : (
                <Sparkles className="w-6 h-6 mr-2" />
              )}
              <div>
                <h2 className="font-bold">Saarthi AI</h2>
                <p className="text-sm text-blue-100">Form Assistant</p>
              </div>
            </div>
          </div>

          {/* Progress Section */}
          <div className="p-4 border-b border-gray-200">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Form Progress</span>
                <span className="text-sm">{formState.progress}%</span>
              </div>
              <Progress value={formState.progress} className="h-3 bg-white/20" />
            </div>
            
            <Badge className={`w-full justify-center py-2 ${
              saarthiState.step === 'ready' ? 'bg-blue-500' :
              saarthiState.step === 'filling' ? 'bg-yellow-500' :
              saarthiState.step === 'voice-needed' ? 'bg-orange-500' :
              saarthiState.step === 'listening' ? 'bg-red-500' :
              saarthiState.step === 'processing' ? 'bg-purple-500' :
              saarthiState.step === 'review' ? 'bg-green-500' :
              'bg-emerald-500'
            } text-white border-0`}>
              {saarthiState.step === 'ready' && '🤖 Ready to Start'}
              {saarthiState.step === 'filling' && '✍️ Auto-Filling Form'}
              {saarthiState.step === 'voice-needed' && '🎤 Voice Input Needed'}
              {saarthiState.step === 'listening' && '🔴 Recording...'}
              {saarthiState.step === 'processing' && '🔄 Processing...'}
              {saarthiState.step === 'review' && '📋 Ready for Review'}
              {saarthiState.step === 'success' && '🎉 Success!'}
            </Badge>
          </div>

          {/* Current Status */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">Current Status</h3>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-700">{saarthiState.status}</p>
            </div>
            
            {currentFieldBeingFilled && (
              <div className="mt-3 text-sm">
                <span className="text-gray-600">Working on:</span>
                <p className="font-medium">{currentFieldBeingFilled}</p>
              </div>
            )}
          </div>

          {/* FIXED: Voice Input Controls */}
          {formState.step === 'voice-input' && (
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">Voice Input</h3>
              
              {voiceState.error && (
                <Alert className="mb-3 bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800 text-sm">
                    {voiceState.error}
                  </AlertDescription>
                </Alert>
              )}

              {voiceState.transcript && (
                <div className="mb-3 p-2 bg-blue-50 rounded border">
                  <p className="text-sm text-blue-800">
                    <strong>You said:</strong> {voiceState.transcript}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                {!voiceState.isListening && !voiceState.isProcessing ? (
                  <Button
                    onClick={startVoiceRecording}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    Start Recording
                  </Button>
                ) : voiceState.isListening ? (
                  <Button
                    onClick={stopVoiceRecording}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop Recording
                  </Button>
                ) : (
                  <Button disabled className="flex-1">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </Button>
                )}
              </div>

              <p className="text-xs text-gray-500 mt-2 text-center">
                Click Start, speak clearly, then click Stop
              </p>
            </div>
          )}

          {/* Action Button */}
          <div className="p-4 border-b border-gray-200">
            {saarthiState.step === 'ready' && (
              <Button
                onClick={startAutoFill}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                🚀 Start Auto-Fill
              </Button>
            )}
            
            {saarthiState.step === 'review' && (
              <Button
                onClick={handleSubmit}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-2" />
                Submit Application
              </Button>
            )}
          </div>

          {/* Progress Log */}
          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="font-semibold text-gray-900 mb-3">Filled Fields ({filledFieldsLog.length})</h3>
            <div className="space-y-2">
              {filledFieldsLog.map((log, index) => (
                <div key={index} className="text-xs text-green-700 bg-green-50 p-2 rounded">
                  ✅ {log}
                </div>
              ))}
              {filledFieldsLog.length === 0 && (
                <div className="text-gray-500 text-sm text-center py-4">
                  Filled fields will appear here...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Form Area */}
        <div className="flex-1 flex flex-col">
          {/* Form Header */}
          <div className="p-6 bg-gradient-to-r from-blue-600 to-green-600 text-white">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold mb-1">Government Application Form</h1>
                <p className="text-blue-100">{schemeTitle} - Online Application</p>
                <p className="text-blue-200 text-sm">Scheme ID: {schemeId}</p>
              </div>
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Form Content */}
          <div ref={formRef} className="flex-1 p-8 overflow-y-auto bg-gray-50">
            {formState.step === 'submitted' ? (
              <div className="flex items-center justify-center h-full">
                <Card className="w-full max-w-md text-center">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-center text-green-600">
                      <Check className="w-8 h-8 mr-2" />
                      Success!
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 mb-4">
                      Your application has been submitted successfully!
                    </p>
                    <Badge variant="outline" className="text-lg p-3">
                      Reference: PMAY2024/DEL/12345
                    </Badge>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Form Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {formFields.map((field, index) => {
                    const validationError = getFieldValidationError(field);
                    
                    return (
                      <div
                        key={field.id}
                        id={`field-${index}`}
                        className={`space-y-3 p-6 rounded-xl transition-all duration-500 border-2 ${
                          index === formState.currentFieldIndex && formState.step === 'auto-filling'
                            ? 'border-blue-500 bg-blue-50 shadow-lg scale-[1.02]'
                            : index === formState.currentFieldIndex && formState.step === 'voice-input'
                            ? 'border-red-500 bg-red-50 shadow-lg scale-[1.02] animate-pulse'
                            : field.filled
                            ? 'border-green-500 bg-green-50 shadow-md'
                            : validationError
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <Label htmlFor={field.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              field.filled 
                                ? 'bg-green-500 text-white' 
                                : validationError 
                                ? 'bg-red-500 text-white' 
                                : 'bg-gray-200 text-gray-600'
                            }`}>
                              {field.icon}
                            </div>
                            <div>
                              <div className="font-medium text-lg">{field.label}</div>
                              {field.required && (
                                <span className="text-red-500 text-sm">Required</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {field.filled && (
                              <Badge className="bg-green-500 text-white">
                                <Check className="w-3 h-3 mr-1" />
                                Filled
                              </Badge>
                            )}
                            
                            {!field.autoFillable && !field.filled && (
                              <Badge className="bg-orange-500 text-white">
                                <Mic className="w-3 h-3 mr-1" />
                                Voice Required
                              </Badge>
                            )}
                            
                            {index === formState.currentFieldIndex && formState.step === 'auto-filling' && (
                              <Badge className="bg-blue-500 text-white animate-pulse">
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Filling...
                              </Badge>
                            )}
                            
                            {index === formState.currentFieldIndex && formState.step === 'voice-input' && (
                              <Badge className="bg-red-500 text-white animate-pulse">
                                <Mic className="w-3 h-3 mr-1" />
                                Listening
                              </Badge>
                            )}
                          </div>
                        </Label>

                        {field.type === 'select' ? (
                          <Select value={field.value} disabled>
                            <SelectTrigger className="text-lg py-6">
                              <SelectValue placeholder={`Select ${field.label}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options?.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : field.type === 'textarea' ? (
                          <Textarea
                            id={field.id}
                            value={field.value}
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                            disabled
                            rows={4}
                            className="text-lg"
                          />
                        ) : (
                          <Input
                            id={field.id}
                            type={field.type}
                            value={field.value}
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                            disabled
                            className="text-lg py-6"
                          />
                        )}

                        {/* Validation Error */}
                        {validationError && (
                          <Alert className="border-red-200 bg-red-50">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            <AlertDescription className="text-red-700">
                              {validationError}
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* Field-specific instructions */}
                        {index === formState.currentFieldIndex && formState.step === 'voice-input' && (
                          <Alert className="border-red-200 bg-red-50">
                            <Mic className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Voice input required!</strong><br />
                              Please use the Start/Stop buttons in the sidebar to record your {field.label.toLowerCase()}.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="p-8 border-t bg-gray-50 sticky bottom-0">
                  <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      This is a simulated government form.<br />
                      <span className="font-medium">Scheme:</span> {schemeTitle}
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={onClose}>
                        Cancel
                      </Button>
                      {formState.step === 'submitted' && (
                        <Badge className="bg-green-500 text-white px-6 py-3 text-base">
                          Application Submitted Successfully!
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulatedGovForm;
