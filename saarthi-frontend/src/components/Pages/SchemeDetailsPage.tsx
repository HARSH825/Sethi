// src/components/Pages/SchemeDetailsPage.tsx (COMPLETE UPDATED FILE - CONTINUED)
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle, 
  XCircle, 
  ExternalLink, 
  ArrowLeft,
  FileText,
  IndianRupee,
  Calendar,
  MapPin,
  Users,
  Building,
  Phone,
  Mail,
  Download,
  Mic,
  Clock,
  MicOff,
  Volume2
} from 'lucide-react';

import { Scheme, UserProfile } from '@/types';
import apiService from '@/services/apiService';
import voiceService from '@/services/voiceService';
import websocketService from '@/services/websocketService';

interface SchemeDetailsPageProps {
  pageData?: {
    schemeId?: string;
    userId?: string;
  };
  userProfile?: UserProfile | null;
  onPageChange?: (page: string, data?: any) => void;
}

const SchemeDetailsPage: React.FC<SchemeDetailsPageProps> = ({ 
  pageData, 
  userProfile, 
  onPageChange 
}) => {
  const [scheme, setScheme] = useState<Scheme | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [eligibilityCheck, setEligibilityCheck] = useState<any>(null);
  const [personalizedExplanation, setPersonalizedExplanation] = useState<string>('');
  
  // Voice interaction states
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(false);
  const [voiceResponse, setVoiceResponse] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [micPermission, setMicPermission] = useState<boolean | null>(null);

  useEffect(() => {
    if (pageData?.schemeId) {
      loadSchemeDetails();
    }
    
    // Initialize microphone
    initializeMicrophone();
    
    // Setup WebSocket listener for scheme navigation
    websocketService.on('scheme-navigation-response', handleSchemeNavigationResponse);
    
    return () => {
      websocketService.off('scheme-navigation-response', handleSchemeNavigationResponse);
    };
  }, [pageData?.schemeId, pageData?.userId]);

  const initializeMicrophone = async () => {
    const hasPermission = await voiceService.initializeMicrophone();
    setMicPermission(hasPermission);
  };

  const handleSchemeNavigationResponse = (data: any) => {
    console.log('📝 Scheme navigation response:', data);
    
    if (data.response) {
      setVoiceResponse(data.response);
      
      // Speak the response
      voiceService.speak(data.response);
      setIsSpeaking(true);
      setTimeout(() => setIsSpeaking(false), data.response.length * 40);
    }
  };

  const loadSchemeDetails = async () => {
    if (!pageData?.schemeId) {
      setError('No scheme selected');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('📄 Loading scheme details:', pageData.schemeId);

      const result = await apiService.getScheme(pageData.schemeId, pageData.userId);
      
      if (result.success && result.scheme) {
        setScheme(result.scheme);
        setEligibilityCheck(result.eligibilityCheck);
        setPersonalizedExplanation(result.personalizedExplanation || '');
        
        console.log('✅ Scheme details loaded:', result.scheme.title);
      } else {
        throw new Error(result.message || 'Failed to load scheme details');
      }

    } catch (err) {
      console.error('❌ Load scheme details failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load scheme details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceQuestion = async () => {
    if (!micPermission) {
      const hasPermission = await voiceService.initializeMicrophone();
      setMicPermission(hasPermission);
      
      if (!hasPermission) {
        alert('Microphone permission required for voice questions');
        return;
      }
    }

    try {
      setIsVoiceActive(true);
      setVoiceResponse('');
      
      await voiceService.startRecording();
      console.log('🎙️ Started voice recording for scheme question');
      
      // Auto-stop after 5 seconds
      setTimeout(async () => {
        if (isVoiceActive) {
          await stopVoiceQuestion();
        }
      }, 5000);
      
    } catch (error) {
      console.error('❌ Voice question failed:', error);
      setIsVoiceActive(false);
    }
  };

  const stopVoiceQuestion = async () => {
    if (!isVoiceActive) return;

    try {
      const audioBlob = await voiceService.stopRecording();
      setIsVoiceActive(false);
      
      if (audioBlob && audioBlob.size > 0 && scheme) {
        console.log('🎤 Processing scheme voice question, audio size:', audioBlob.size);
        
        const userId = userProfile?.id || websocketService.getUserId() || 'anonymous';
        
        // FIXED: Ensure userProfile is always valid
        const profileToSend = userProfile || {
          id: userId,
          name: 'User',
          attributes: {
            income: null,
            age: null,
            occupation: null
          },
          address: {
            state: null,
            district: null
          }
        };
        
        console.log('👤 Sending user profile:', {
          name: profileToSend.name,
          income: profileToSend.attributes?.income,
          hasProfile: !!userProfile
        });
        console.log('📋 Sending scheme data:', { 
          id: scheme.id, 
          title: scheme.title,
          benefit: scheme.benefitAmount 
        });
        
        const result = await voiceService.processSchemeAudio(
          audioBlob, 
          scheme, 
          profileToSend,
          userId
        );
        
        console.log('📥 Scheme voice result:', result);
        
        if (result.success && result.response) {
          // If WebSocket doesn't work, handle directly
          if (!websocketService.isConnected()) {
            console.log('⚠️ WebSocket not connected, handling response directly');
            setVoiceResponse(result.response);
            voiceService.speak(result.response);
            setIsSpeaking(true);
            setTimeout(() => setIsSpeaking(false), result.response.length * 40);
          }
        } else {
          const errorMessage = result.response || "I didn't understand your question. Could you try again?";
          setVoiceResponse(errorMessage);
          voiceService.speak(errorMessage);
        }
      } else {
        const noAudioMessage = "I didn't hear anything. Please try asking your question again.";
        setVoiceResponse(noAudioMessage);
        voiceService.speak(noAudioMessage);
      }
      
    } catch (error) {
      console.error('❌ Process voice question failed:', error);
      const errorMessage = "Sorry, there was an error processing your question. Please try again.";
      setVoiceResponse(errorMessage);
      voiceService.speak(errorMessage);
    }
  };

  const handleStartApplication = () => {
    if (scheme) {
      console.log('🚀 Starting application for:', scheme.title);
      // This will be enhanced in Phase 2 for browser automation
      window.open(scheme.applicationUrl, '_blank');
    }
  };

  const getEligibilityBadge = () => {
    if (!eligibilityCheck) return null;
    
    if (eligibilityCheck.eligible) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 text-base px-3 py-1">
          <CheckCircle className="w-4 h-4 mr-2" />
          You're Eligible!
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200 text-base px-3 py-1">
          <XCircle className="w-4 h-4 mr-2" />
          Not Eligible
        </Badge>
      );
    }
  };

  const getEstimatedTime = () => {
    if (!scheme) return '5-10 minutes';
    
    const docCount = scheme.requiredDocuments?.length || 0;
    if (docCount <= 2) return '5-8 minutes';
    if (docCount <= 4) return '8-12 minutes';
    return '12-15 minutes';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 lg:p-12">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-8 w-full mb-4" />
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            </div>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !scheme) {
    return (
      <div className="min-h-screen p-6 lg:p-12 flex items-center justify-center">
        <Card className="max-w-md mx-auto border-red-200 bg-red-50">
          <CardContent className="p-8 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Scheme</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <Button 
              onClick={() => onPageChange?.('recommendations')} 
              variant="outline" 
              className="border-red-300 text-red-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Recommendations
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-12">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => onPageChange?.('recommendations')}
            className="mb-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Recommendations
          </Button>
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                {scheme.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Building className="w-4 h-4" />
                  {scheme.agency}
                </div>
                {scheme.state && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {scheme.state === 'ALL_INDIA' ? 'All India' : scheme.state}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {getEligibilityBadge()}
              <Badge variant="outline" className="text-base px-3 py-2">
                <IndianRupee className="w-4 h-4 mr-1" />
                ₹{scheme.benefitAmount.toLocaleString()}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Voice Interaction Card */}
            <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
                      isVoiceActive 
                        ? 'bg-red-500 animate-pulse scale-110' 
                        : isSpeaking 
                        ? 'bg-green-500 animate-pulse' 
                        : 'bg-blue-500'
                    }`}>
                      {isVoiceActive ? (
                        <MicOff className="h-6 w-6 text-white" />
                      ) : isSpeaking ? (
                        <Volume2 className="h-6 w-6 text-white" />
                      ) : (
                        <Mic className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">Ask Saarthi About This Scheme</h3>
                      <p className="text-gray-600 text-sm">
                        {isVoiceActive 
                          ? 'Listening... (5 seconds max)' 
                          : isSpeaking 
                          ? 'Saarthi is responding...'
                          : 'Try: "How do I apply?" or "What documents do I need?"'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isVoiceActive && (
                      <Button 
                        variant="outline"
                        onClick={stopVoiceQuestion}
                        className="border-red-300 text-red-600"
                      >
                        Stop
                      </Button>
                    )}
                    
                    <Button 
                      className={`saarthi-gradient text-white transition-all duration-200 ${
                        isVoiceActive ? 'opacity-75 cursor-not-allowed' : ''
                      }`}
                      onClick={handleVoiceQuestion}
                      disabled={isVoiceActive || !micPermission}
                    >
                      <Mic className="w-4 h-4 mr-2" />
                      {isVoiceActive ? 'Listening...' : 'Ask Question'}
                    </Button>
                  </div>
                </div>
                
                {/* Voice response display */}
                {voiceResponse && (
                  <div className="mt-4 p-4 bg-white rounded-lg border-l-4 border-blue-500 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-bold">S</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-800 leading-relaxed">{voiceResponse}</p>
                        {isSpeaking && (
                          <div className="flex items-center gap-1 mt-2">
                            <Volume2 className="w-4 h-4 text-blue-500" />
                            <span className="text-xs text-blue-600">Speaking...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Microphone permission warning */}
                {micPermission === false && (
                  <Alert className="mt-4 border-amber-200 bg-amber-50">
                    <AlertDescription className="text-xs text-amber-800">
                      🎤 Microphone access required for voice questions
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Personalized Explanation */}
            {personalizedExplanation && (
              <Card className="border-green-200 bg-green-50/50">
                <CardHeader>
                  <CardTitle className="text-green-800 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Personalized for You
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-green-900 leading-relaxed">{personalizedExplanation}</p>
                </CardContent>
              </Card>
            )}

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>About This Scheme</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed text-lg">{scheme.description}</p>
              </CardContent>
            </Card>

            {/* Eligibility Details */}
            <Card>
              <CardHeader>
                <CardTitle>Eligibility Criteria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {scheme.eligibilityCriteria && (
                    <div className="grid md:grid-cols-2 gap-4">
                      {scheme.eligibilityCriteria.max_income && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <IndianRupee className="w-5 h-5 text-gray-600" />
                          <div>
                            <p className="font-medium text-gray-900">Maximum Income</p>
                            <p className="text-sm text-gray-600">₹{scheme.eligibilityCriteria.max_income.toLocaleString()} per year</p>
                          </div>
                        </div>
                      )}
                      
                      {scheme.eligibilityCriteria.min_age && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <Users className="w-5 h-5 text-gray-600" />
                          <div>
                            <p className="font-medium text-gray-900">Age Requirement</p>
                            <p className="text-sm text-gray-600">
                              {scheme.eligibilityCriteria.min_age}
                              {scheme.eligibilityCriteria.max_age && ` - ${scheme.eligibilityCriteria.max_age}`} years
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Personal Eligibility Check */}
                  {eligibilityCheck && (
                    <div className="mt-6">
                      <h4 className="font-semibold text-gray-900 mb-3">Your Eligibility Status</h4>
                      <div className="space-y-2">
                        {eligibilityCheck.reasons?.map((reason: string, index: number) => (
                          <div key={index} className={`flex items-center gap-2 text-sm ${
                            eligibilityCheck.eligible ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {eligibilityCheck.eligible ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                            {reason}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Required Documents */}
            <Card>
              <CardHeader>
                <CardTitle>Required Documents</CardTitle>
                <CardDescription>Make sure you have these documents ready</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-3">
                  {scheme.requiredDocuments?.map((doc, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-500" />
                      <span className="text-gray-900">{doc}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Quick Actions */}
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-green-800">Ready to Apply?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Application CTA */}
                <Button 
                  className="w-full text-lg py-6 saarthi-gradient text-white"
                  onClick={handleStartApplication}
                  disabled={eligibilityCheck && !eligibilityCheck.eligible}
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Start Application
                </Button>

                {/* Time Estimate */}
                <div className="flex items-center gap-2 text-sm text-gray-600 justify-center">
                  <Clock className="w-4 h-4" />
                  Estimated time: {getEstimatedTime()}
                </div>

                <div className="text-xs text-gray-500 text-center">
                  Saarthi will help you fill the form (Phase 2 coming soon!)
                </div>

                {/* Alternative Actions */}
                <div className="border-t pt-4 space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => window.open(scheme.applicationUrl, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Official Portal
                  </Button>
                  
                  <Button variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Download Form
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Scheme Tags */}
            {scheme.tags && scheme.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {scheme.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Deadline */}
            {scheme.deadline && (
              <Alert>
                <Calendar className="h-4 w-4" />
                <AlertDescription>
                  <strong>Application Deadline:</strong><br />
                  {new Date(scheme.deadline).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </AlertDescription>
              </Alert>
            )}

            {/* Help */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start text-sm">
                  <Phone className="w-4 h-4 mr-2" />
                  Call Helpline
                </Button>
                <Button variant="outline" className="w-full justify-start text-sm">
                  <Mail className="w-4 h-4 mr-2" />
                  Email Support
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-sm"
                  onClick={() => onPageChange?.('recommendations')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Browse Other Schemes
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchemeDetailsPage;
