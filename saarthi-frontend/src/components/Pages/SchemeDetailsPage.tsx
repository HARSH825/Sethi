// src/components/Pages/SchemeDetailsPage.tsx (FIXED - WITH STOP LISTENING OPTION)

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  Download,
  Users,
  Calendar,
  FileText,
  DollarSign,
  MapPin,
  CheckCircle,
  AlertCircle,
  Mic,
  MicOff,
  Volume2,
  Loader2,
  MessageCircle,
  Square // ADDED: For stop button
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

import voiceService from '@/services/voiceService';
import websocketService from '@/services/websocketService';
import profileManager from '@/services/profileManager';
import { Scheme, UserProfile } from '@/types';

interface SchemeDetailsPageProps {
  onPageChange: (page: string, data?: any) => void;
  schemeId?: string;
  pageData?: any;
}

const SchemeDetailsPage: React.FC<SchemeDetailsPageProps> = ({ 
  onPageChange, 
  schemeId,
  pageData 
}) => {
  const currentSchemeId = schemeId || pageData?.schemeId || '';

  // Data states
  const [scheme, setScheme] = useState<Scheme | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [personalizedExplanation, setPersonalizedExplanation] = useState('');

  // Voice states
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceResponse, setVoiceResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false); // ADDED: Processing state

  const voiceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadSchemeData();
    loadUserProfile();
  }, [currentSchemeId]);

  // ADDED: Cleanup on unmount
  useEffect(() => {
    return () => {
      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current);
      }
    };
  }, []);

  const loadSchemeData = async () => {
    try {
      setIsLoading(true);
      setError('');

      if (!currentSchemeId) {
        throw new Error('No scheme ID provided');
      }

      console.log('📋 Loading scheme data for:', currentSchemeId);

      const response = await fetch(`http://localhost:3001/api/schemes/${encodeURIComponent(currentSchemeId)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch scheme: ${response.status}`);
      }

      const data = await response.json();
      console.log('📥 Scheme data received:', data);

      if (!data.success) {
        throw new Error(data.message || 'Failed to load scheme');
      }

      setScheme(data.scheme);
      setPersonalizedExplanation(data.personalizedExplanation || '');

    } catch (err) {
      console.error('❌ Error loading scheme:', err);
      setError(err instanceof Error ? err.message : 'Failed to load scheme');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      const profile = await profileManager.initializeProfile();
      setUserProfile(profile);
      console.log('👤 User profile loaded:', profile?.name);
    } catch (err) {
      console.error('❌ Error loading user profile:', err);
    }
  };

  // FIXED: Start voice recording with manual stop option
  const handleVoiceQuestion = async () => {
    if (!scheme || !userProfile || isVoiceActive || isSpeaking || isProcessing) {
      return;
    }

    try {
      setIsVoiceActive(true);
      setVoiceResponse('');
      setIsProcessing(false);

      // Start recording
      await voiceService.startRecording();
      console.log('🎤 Started recording for scheme question');

      // FIXED: Longer timeout - 10 seconds instead of 5
      voiceTimeoutRef.current = setTimeout(async () => {
        console.log('⏰ Auto-stopping recording after timeout');
        await stopVoiceRecording();
      }, 10000);

    } catch (error) {
      console.error('❌ Voice question failed:', error);
      setIsVoiceActive(false);
    }
  };

  // FIXED: Manual stop function
  const stopVoiceRecording = async () => {
    try {
      if (!isVoiceActive) return;

      console.log('⏹️ Stopping voice recording...');
      setIsVoiceActive(false);
      setIsProcessing(true); // Show processing state
      
      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current);
        voiceTimeoutRef.current = null;
      }

      const audioBlob = await voiceService.stopRecording();

      if (audioBlob && audioBlob.size > 0) {
        console.log('🎤 Audio recorded, processing scheme question...');

        const userId = userProfile?.id || `temp_${Date.now()}`;
        const context = {
          userId,
          type: 'scheme' as const,
          schemeData: JSON.stringify(scheme),
          userProfile: JSON.stringify(userProfile),
          sessionData: {
            currentPage: 'scheme-details',
            schemeId: currentSchemeId
          }
        };

        const result = await voiceService.processAudio(audioBlob, context);

        if (result.success && result.response) {
          setVoiceResponse(result.response);
          
          // Speak the response
          setIsSpeaking(true);
          try {
            await voiceService.speak(result.response);
          } catch (speakError) {
            console.error('❌ TTS failed:', speakError);
          } finally {
            setIsSpeaking(false);
          }
        } else {
          setVoiceResponse("I couldn't understand your question. Please try again.");
        }
      } else {
        setVoiceResponse("I didn't hear anything. Please make sure your microphone is working and try again.");
      }
    } catch (error) {
      console.error('❌ Stop recording failed:', error);
      setVoiceResponse("Something went wrong with the recording. Please try again.");
    } finally {
      setIsVoiceActive(false);
      setIsProcessing(false);
    }
  };

  // ADDED: Cancel recording function
  const cancelVoiceRecording = async () => {
    try {
      console.log('❌ Cancelling voice recording...');
      setIsVoiceActive(false);
      setIsProcessing(false);
      
      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current);
        voiceTimeoutRef.current = null;
      }

      // Stop recording without processing
      await voiceService.stopRecording();
      setVoiceResponse('');
      
    } catch (error) {
      console.error('❌ Cancel recording failed:', error);
    }
  };

  const calculateEligibilityScore = (): { score: number; reasons: string[] } => {
    if (!scheme || !userProfile) return { score: 0, reasons: [] };

    let score = 0;
    const reasons: string[] = [];
    const criteria = scheme.eligibilityCriteria;

    // Income check
    if (criteria.max_income && userProfile.attributes?.income) {
      if (userProfile.attributes.income <= criteria.max_income) {
        score += 40;
        reasons.push(`✅ Income (₹${userProfile.attributes.income.toLocaleString()}) is within limit`);
      } else {
        reasons.push(`❌ Income (₹${userProfile.attributes.income.toLocaleString()}) exceeds limit of ₹${criteria.max_income.toLocaleString()}`);
      }
    }

    // Age check
    if (criteria.min_age && userProfile.attributes?.age) {
      if (userProfile.attributes.age >= criteria.min_age) {
        score += 30;
        reasons.push(`✅ Age (${userProfile.attributes.age}) meets minimum requirement`);
      } else {
        reasons.push(`❌ Age (${userProfile.attributes.age}) below minimum of ${criteria.min_age}`);
      }
    }

    // Document check
    if (criteria.required_documents && userProfile.documents) {
      const hasRequiredDocs = criteria.required_documents.every(doc => {
        const docKey = doc.toLowerCase().replace(' ', '_') as keyof typeof userProfile.documents;
        return userProfile.documents?.[docKey] === true;
      });
      
      if (hasRequiredDocs) {
        score += 30;
        reasons.push('✅ All required documents available');
      } else {
        reasons.push('❌ Some required documents missing');
      }
    }

    return { score: Math.min(score, 100), reasons };
  };

  const formatBenefitAmount = (amount: number): string => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)} Lakh`;
    }
    return `₹${amount.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading scheme details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto pt-20">
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button
            onClick={() => onPageChange('recommendations')}
            variant="outline"
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Recommendations
          </Button>
        </div>
      </div>
    );
  }

  if (!scheme) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto pt-20">
          <p className="text-gray-600 mb-4">Scheme not found</p>
          <Button
            onClick={() => onPageChange('recommendations')}
            variant="outline"
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Recommendations
          </Button>
        </div>
      </div>
    );
  }

  const eligibility = calculateEligibilityScore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto pt-20 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            onClick={() => onPageChange('recommendations')}
            variant="outline"
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Recommendations
          </Button>

          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="flex items-center">
              <MapPin className="w-3 h-3 mr-1" />
              {scheme.agency}
            </Badge>
            <Badge variant="outline">
              <MapPin className="w-3 h-3 mr-1" />
              {scheme.state}
            </Badge>
          </div>
        </div>

        {/* Scheme Title */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {scheme.title}
            </h1>
            <div className="flex items-center space-x-4 text-gray-600">
              <span className="flex items-center">
                <FileText className="w-4 h-4 mr-1" />
                {scheme.agency}
              </span>
              <span className="flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                {scheme.state}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              {formatBenefitAmount(scheme.benefitAmount)}
            </div>
            <div className="text-sm text-gray-500">Maximum Benefit</div>
          </div>
        </div>

        {/* FIXED: Ask Saarthi About This Scheme - With Stop Option */}
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Ask Saarthi About This Scheme</h3>
                  <p className="text-gray-600 text-sm">
                    {isVoiceActive ? 'Listening... (Click Stop to finish early)' : 
                     isProcessing ? 'Processing your question...' :
                     isSpeaking ? 'Saarthi is responding...' : 
                     'Try: "How do I apply?" or "What documents do I need?"'}
                  </p>
                </div>
              </div>
              
              {/* FIXED: Dynamic button based on state */}
              <div className="flex items-center space-x-2">
                {isVoiceActive ? (
                  // Show Stop and Cancel buttons when recording
                  <>
                    <Button
                      onClick={stopVoiceRecording}
                      className="bg-red-600 hover:bg-red-700 flex items-center space-x-2"
                    >
                      <Square className="w-4 h-4" />
                      <span>Stop & Send</span>
                    </Button>
                    <Button
                      onClick={cancelVoiceRecording}
                      variant="outline"
                      className="flex items-center space-x-2"
                    >
                      <MicOff className="w-4 h-4" />
                      <span>Cancel</span>
                    </Button>
                  </>
                ) : (
                  // Show Ask Question button when not recording
                  <Button
                    onClick={handleVoiceQuestion}
                    disabled={isProcessing || isSpeaking}
                    className={`flex items-center space-x-2 ${
                      isProcessing ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isSpeaking ? (
                      <Volume2 className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                    <span>
                      {isProcessing ? 'Processing...' : isSpeaking ? 'Speaking...' : 'Ask Question'}
                    </span>
                  </Button>
                )}
              </div>
            </div>

            {/* Voice Response */}
            {voiceResponse && (
              <div className="mt-4 p-4 bg-white rounded-lg border">
                <p className="text-gray-800">{voiceResponse}</p>
                {isSpeaking && (
                  <div className="flex items-center mt-2 text-blue-600">
                    <Volume2 className="w-4 h-4 mr-1 animate-pulse" />
                    <span className="text-sm">Speaking...</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* About This Scheme */}
            <Card>
              <CardHeader>
                <CardTitle>About This Scheme</CardTitle>
              </CardHeader>
              <CardContent>
                {personalizedExplanation && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-blue-800 font-medium mb-2">Why this is relevant for you:</p>
                    <p className="text-blue-700">{personalizedExplanation}</p>
                  </div>
                )}
                <p className="text-gray-700 leading-relaxed">{scheme.description}</p>
              </CardContent>
            </Card>

            {/* Eligibility Criteria */}
            <Card>
              <CardHeader>
                <CardTitle>Eligibility Criteria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {scheme.eligibilityCriteria.max_income && (
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Maximum Income</span>
                    <span>₹{scheme.eligibilityCriteria.max_income.toLocaleString()} per year</span>
                  </div>
                )}
                
                {scheme.eligibilityCriteria.min_age && (
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Age Requirement</span>
                    <span>
                      {scheme.eligibilityCriteria.min_age}
                      {scheme.eligibilityCriteria.max_age && ` - ${scheme.eligibilityCriteria.max_age}`} years
                    </span>
                  </div>
                )}

                {scheme.eligibilityCriteria.states && scheme.eligibilityCriteria.states.length > 0 && (
                  <div>
                    <span className="font-medium">Applicable States</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {scheme.eligibilityCriteria.states.map((state, index) => (
                        <Badge key={index} variant="secondary">{state}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Required Documents */}
            {scheme.requiredDocuments && scheme.requiredDocuments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Required Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {scheme.requiredDocuments.map((doc, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="text-gray-700">{doc}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Scheme Tags */}
            {scheme.tags && scheme.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {scheme.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Ready to Apply */}
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-green-800">Ready to Apply?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  <FileText className="w-4 h-4 mr-2" />
                  Start Application
                </Button>
                
                <div className="flex items-center text-sm text-green-700">
                  <Calendar className="w-4 h-4 mr-1" />
                  Estimated time: 8-12 minutes
                </div>
                
                <p className="text-sm text-green-600">
                  Saarthi will help you fill the form (Phase 2 coming soon!)
                </p>
                
                <Separator />
                
                <Button variant="outline" className="w-full">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Official Portal
                </Button>
                
                <Button variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download Form
                </Button>
              </CardContent>
            </Card>

            {/* Eligibility Check */}
            {userProfile && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Eligibility</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Match Score</span>
                      <span className="text-2xl font-bold text-green-600">
                        {eligibility.score}%
                      </span>
                    </div>
                    
                    <Progress value={eligibility.score} className="h-2" />
                    
                    <div className="space-y-2">
                      {eligibility.reasons.map((reason, index) => (
                        <div key={index} className="text-sm flex items-start">
                          <span className="mr-2">
                            {reason.startsWith('✅') ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            )}
                          </span>
                          <span className={`${reason.startsWith('✅') ? 'text-green-700' : 'text-red-700'}`}>
                            {reason.replace(/^[✅❌]\s*/, '')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Scheme Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {scheme.tags?.slice(0, 6).map((tag, index) => (
                    <Badge key={index} variant="secondary" className="justify-center">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchemeDetailsPage;
