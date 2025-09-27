// src/components/Saarthi/SaarthiSidebar.tsx (COMPLETE UPDATED FILE)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  MessageCircle, 
  User, 
  Volume2, 
  VolumeX,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Minimize2,
  Users,
  FileText,
  Trophy,
  Wifi,
  WifiOff
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

import voiceService from '@/services/voiceService';
import websocketService from '@/services/websocketService';
import profileManager from '@/services/profileManager';
import { UserProfile, ChatMessage, OnboardingField, ConnectionStatus } from '@/types';

interface SaarthiSidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
  currentPage?: string;
  onPageChange?: (page: string, data?: any) => void;
}

const SaarthiSidebar: React.FC<SaarthiSidebarProps> = ({ 
  isOpen = true, 
  onToggle, 
  currentPage = 'home',
  onPageChange 
}) => {
  // Voice states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [micPermission, setMicPermission] = useState<boolean | null>(null);
  
  // User states
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [onboardingProgress, setOnboardingProgress] = useState<number>(0);
  const [isOnboarding, setIsOnboarding] = useState<boolean>(false);
  const [currentField, setCurrentField] = useState<OnboardingField | null>(null);
  
  // Chat states
  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const [lastTranscript, setLastTranscript] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  
  // UI states
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  
  // Refs
  const conversationEndRef = useRef<HTMLDivElement>(null);

  // Onboarding sequence
  const onboardingSequence: OnboardingField[] = ['name', 'dob', 'location', 'income', 'family_size', 'occupation', 'documents'];

  // Initialize Saarthi on component mount
  useEffect(() => {
    initializeSaarthi();
    return () => cleanup();
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // src/components/Saarthi/SaarthiSidebar.tsx (UPDATE initializeSaarthi method)

const initializeSaarthi = async (): Promise<void> => {
  try {
    console.log('🚀 Initializing Saarthi...');
    
    // Load cached profile
    const profile = await profileManager.initializeProfile();
    setUserProfile(profile);
    
    if (!profile) {
      setIsOnboarding(true);
      setCurrentField('name');
      const welcomeMessage = "Hi! I'm Saarthi, your personal government scheme assistant. I'll help you discover benefits you deserve! Let's start by getting to know you. What's your full name?";
      addMessage('saarthi', welcomeMessage);
      
      // FIXED: Auto-speak the first message after a short delay
      setTimeout(() => {
        voiceService.speak(welcomeMessage);
        setIsSpeaking(true);
        setTimeout(() => setIsSpeaking(false), welcomeMessage.length * 40);
      }, 1000); // 1 second delay to ensure everything is loaded
      
    } else {
      const welcomeBackMessage = `Welcome back, ${profile.name}! How can I help you today?`;
      addMessage('saarthi', welcomeBackMessage);
      
      // Also speak welcome back message
      setTimeout(() => {
        voiceService.speak(welcomeBackMessage);
        setIsSpeaking(true);
        setTimeout(() => setIsSpeaking(false), welcomeBackMessage.length * 40);
      }, 1000);
    }
    
    // Initialize microphone
    const hasPermission = await voiceService.initializeMicrophone();
    setMicPermission(hasPermission);
    
    // Initialize voices for better TTS
    await voiceService.initializeVoices();
    
    // Connect to WebSocket
    const userId = profile?.id || `temp_${Date.now()}`;
    console.log('🔌 Connecting WebSocket with userId:', userId);
    
    websocketService.connect(userId);
    
    // WebSocket event listeners
    websocketService.on('session-joined', (data: any) => {
      console.log('✅ WebSocket session joined:', data);
      setConnectionStatus('connected');
      
      setTimeout(() => {
        websocketService.testConnection();
      }, 1000);
    });
    
    websocketService.on('onboarding-progress', handleOnboardingProgress);
    websocketService.on('navigation-response', handleNavigationResponse);
    websocketService.on('connection-error', (data: any) => {
      console.error('❌ WebSocket connection error:', data);
      setConnectionStatus('error');
    });
    
    // Monitor connection status
    const connectionCheckInterval = setInterval(() => {
      const isConnected = websocketService.isConnected();
      const status = websocketService.getConnectionStatus();
      setConnectionStatus(status);
    }, 5000);
    
    return () => clearInterval(connectionCheckInterval);
    
  } catch (error) {
    console.error('❌ Saarthi initialization failed:', error);
    addMessage('saarthi', "I'm having trouble starting up. Please refresh the page and try again.");
    setConnectionStatus('error');
  }
};


  // src/components/Saarthi/SaarthiSidebar.tsx (UPDATE handleOnboardingProgress method)

const handleOnboardingProgress = useCallback((data: any) => {
  console.log('📝 Processing onboarding progress event:', data);
  
  try {
    // FIXED: Prevent duplicate responses by checking if we already processed this message
    const messageId = `${data.field}_${data.transcript}_${data.timestamp}`;
    const existingMessage = conversation.find(msg => 
      msg.sender === 'saarthi' && 
      msg.message === data.response &&
      Math.abs(new Date(msg.timestamp).getTime() - new Date(data.timestamp).getTime()) < 2000 // Within 2 seconds
    );
    
    if (existingMessage) {
      console.log('⚠️ Duplicate response detected, skipping');
      return;
    }
    
    // Update progress first
    if (data.progress !== undefined) {
      console.log('📊 Updating progress from', onboardingProgress, 'to', data.progress);
      setOnboardingProgress(data.progress);
    }
    
    // Add user message only if we have a transcript
    if (data.transcript && data.transcript.trim()) {
      console.log('👤 Adding user message:', data.transcript);
      
      // Check if this user message already exists
      const existingUserMessage = conversation.find(msg => 
        msg.sender === 'user' && 
        msg.message === data.transcript &&
        Math.abs(new Date(msg.timestamp).getTime() - new Date(data.timestamp).getTime()) < 5000
      );
      
      if (!existingUserMessage) {
        addMessage('user', data.transcript);
      }
    }
    
    // Add Saarthi response only if we have one and it's not duplicate
    if (data.response && data.response.trim()) {
      console.log('🤖 Adding Saarthi response:', data.response);
      addMessage('saarthi', data.response);
      
      // Speak the response with a small delay
      setTimeout(() => {
        voiceService.speak(data.response);
        setIsSpeaking(true);
        setTimeout(() => setIsSpeaking(false), data.response.length * 40);
      }, 500);
    }
    
    // Update profile with new data
    if (data.field && data.extractedValue) {
      console.log('💾 Updating profile field:', data.field, '=', data.extractedValue);
      const updatedProfile = profileManager.updateProfileField(data.field as keyof UserProfile, data.extractedValue);
      setUserProfile(updatedProfile);
    }
    
    // Update current field
    if (data.nextField) {
      console.log('➡️ Moving to next field:', data.nextField);
      setCurrentField(data.nextField as OnboardingField);
    } else if (data.nextField === null) {
      console.log('🏁 No more fields - onboarding complete');
      setCurrentField(null);
    }
    
    // Check if onboarding is complete
    if (data.isComplete || data.nextField === null) {
      console.log('🎉 Onboarding complete!');
      setIsOnboarding(false);
      setCurrentField(null);
      const completionMessage = "🎉 Perfect! Your profile is complete. Let me find government schemes tailored just for you...";
      addMessage('saarthi', completionMessage);
      
      setTimeout(() => {
        completeOnboarding();
      }, 2000);
    }
    
  } catch (error) {
    console.error('❌ Error processing onboarding progress:', error);
  }
}, [conversation, onboardingProgress]); // Added conversation to dependencies


  const handleNavigationResponse = useCallback((data: any) => {
    console.log('🧭 Processing navigation response:', data);
    
    if (data.transcript) {
      addMessage('user', data.transcript);
    }
    
    if (data.response) {
      addMessage('saarthi', data.response);
      voiceService.speak(data.response);
      setIsSpeaking(true);
      setTimeout(() => setIsSpeaking(false), data.response.length * 40);
    }
    
    // Handle navigation actions
    if (data.action === 'show_scheme' && data.targetScheme) {
      onPageChange?.('scheme-details', { schemeId: data.targetScheme });
    }
  }, [onPageChange]);

  /**
   * FIXED: Complete onboarding with auto-redirect
   */
  const completeOnboarding = async (): Promise<void> => {
    try {
      setIsProcessing(true);
      const profile = profileManager.getCachedProfile();
      
      if (profile) {
        console.log('💾 Saving profile to database:', profile);
        
        // Save to database
        const response = await fetch('http://localhost:3001/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profile)
        });
        
        const userData = await response.json();
        console.log('📥 Backend response:', userData);
        
        if (userData.success) {
          // Update profile with database ID
          const updatedProfile: UserProfile = { ...profile, id: userData.user.id };
          profileManager.cacheProfile(updatedProfile);
          setUserProfile(updatedProfile);
          
          const schemeCount = userData.recommendations?.length || 0;
          addMessage('saarthi', `🎯 Excellent! I found ${schemeCount} government schemes you're eligible for, worth potentially thousands of rupees! Taking you to your personalized recommendations now...`);
          
          // FIXED: AUTO-REDIRECT TO RECOMMENDATIONS
          setTimeout(() => {
            console.log('🔄 Auto-redirecting to recommendations page');
            onPageChange?.('recommendations', { 
              userId: userData.user.id,
              recommendations: userData.recommendations 
            });
          }, 3000); // 3 second delay to let user read the message
          
        } else {
          throw new Error(userData.message || 'Failed to save profile');
        }
      } else {
        throw new Error('No profile data found');
      }
    } catch (error) {
      console.error('❌ Complete onboarding failed:', error);
      addMessage('saarthi', "I saved your profile locally. Let me show you some great schemes anyway!");
      
      // Fallback redirect even if database save fails
      setTimeout(() => {
        console.log('🔄 Fallback redirect to recommendations');
        onPageChange?.('recommendations', { userId: 'local' });
      }, 2000);
    } finally {
      setIsProcessing(false);
    }
  };

  const startVoiceRecording = async (): Promise<void> => {
    if (!micPermission) {
      const hasPermission = await voiceService.initializeMicrophone();
      setMicPermission(hasPermission);
      
      if (!hasPermission) {
        addMessage('saarthi', "I need microphone access to hear you. Please click the microphone icon in your browser and allow access, then try again.");
        return;
      }
    }

    try {
      setIsRecording(true);
      await voiceService.startRecording();
      addMessage('system', '🎤 Listening... (Release button to send)');
      console.log('🎙️ Started recording');
    } catch (error) {
      console.error('❌ Start recording failed:', error);
      setIsRecording(false);
      addMessage('saarthi', "I couldn't start recording. Please check your microphone and try again.");
    }
  };

  const stopVoiceRecording = async (): Promise<void> => {
    if (!isRecording) return;

    try {
      console.log('⏹️ Stopping voice recording...');
      setIsRecording(false);
      setIsProcessing(true);
      
      // Remove the "Listening..." message
      setConversation(prev => prev.filter(msg => msg.sender !== 'system'));
      
      const audioBlob = await voiceService.stopRecording();
      
      if (audioBlob && audioBlob.size > 0) {
        console.log('🎤 Audio recorded, size:', audioBlob.size);
        
        // Determine context based on current state
        const userId = userProfile?.id || websocketService.getUserId() || `temp_${Date.now()}`;
        const context = {
          userId,
          type: isOnboarding ? 'onboarding' as const : 'navigation' as const,
          currentField: currentField || undefined,
          sessionData: {
            onboardingProgress,
            currentPage,
            userProfile
          }
        };
        
        console.log('📤 Sending audio with context:', context);
        
        // Process audio with backend
        const result = await voiceService.processAudio(audioBlob, context);
        
        console.log('📥 Received result from backend:', result);
        
        if (result.success) {
          setLastTranscript(result.transcript || '');
          
          // Handle response directly if WebSocket fails
          const isWsConnected = websocketService.isConnected();
          console.log('🔌 WebSocket connected:', isWsConnected);
          
          if (!isWsConnected) {
            console.log('⚠️ WebSocket not connected, handling response directly');
            
            if (result.transcript) {
              addMessage('user', result.transcript);
            }
            
            if (result.response) {
              addMessage('saarthi', result.response);
              
              // Update progress
              if (result.progress !== undefined) {
                setOnboardingProgress(result.progress);
              }
              
              // Update profile
              if (result.extractedValue && currentField) {
                const updatedProfile = profileManager.updateProfileField(currentField, result.extractedValue);
                setUserProfile(updatedProfile);
              }
              
              // Move to next field
              if (result.nextField) {
                setCurrentField(result.nextField as OnboardingField);
              } else if (result.isComplete) {
                setIsOnboarding(false);
                setCurrentField(null);
                setTimeout(() => completeOnboarding(), 1000);
              }
              
              // Speak response
              voiceService.speak(result.response);
              setIsSpeaking(true);
              setTimeout(() => setIsSpeaking(false), result.response.length * 40);
            }
          }
          // If WebSocket is connected, wait for WebSocket response
          
        } else {
          addMessage('saarthi', result.response || "I couldn't understand that clearly. Could you please try speaking again?");
        }
      } else {
        addMessage('saarthi', "I didn't hear anything. Please make sure your microphone is working and try again.");
      }
    } catch (error) {
      console.error('❌ Stop recording failed:', error);
      addMessage('saarthi', "Something went wrong with the recording. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const addMessage = useCallback((sender: ChatMessage['sender'], message: string): void => {
    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random()}`,
      sender,
      message,
      timestamp: new Date()
    };
    
    setConversation(prev => [...prev, newMessage]);
  }, []);

  const toggleSpeaking = (): void => {
    if (isSpeaking) {
      voiceService.stopSpeaking();
      setIsSpeaking(false);
    } else {
      const lastSaarthiMessage = conversation
        .slice()
        .reverse()
        .find(msg => msg.sender === 'saarthi');
      
      if (lastSaarthiMessage) {
        voiceService.speak(lastSaarthiMessage.message);
        setIsSpeaking(true);
        setTimeout(() => setIsSpeaking(false), lastSaarthiMessage.message.length * 40);
      }
    }
  };

  const cleanup = (): void => {
    console.log('🧹 Cleaning up Saarthi...');
    voiceService.cleanup();
    websocketService.disconnect();
  };

  const getStatusColor = (): string => {
    if (isProcessing) return 'bg-yellow-500 animate-pulse';
    if (isRecording) return 'bg-red-500 animate-pulse';
    if (connectionStatus === 'connected') return 'bg-green-500';
    if (connectionStatus === 'error') return 'bg-red-500';
    return 'bg-gray-400';
  };

  const getStatusText = (): string => {
    if (isProcessing) return 'Processing...';
    if (isRecording) return 'Listening...';
    if (connectionStatus === 'connected') return 'Ready';
    if (connectionStatus === 'error') return 'Error';
    return 'Connecting...';
  };

  const getCurrentFieldLabel = (): string => {
    const fieldLabels: Record<OnboardingField, string> = {
      name: 'Full Name',
      dob: 'Date of Birth',
      location: 'Location',
      income: 'Monthly Income',
      family_size: 'Family Size',
      occupation: 'Occupation',
      documents: 'Documents'
    };
    
    return currentField ? fieldLabels[currentField] : '';
  };

  // Floating button when collapsed
  if (!isOpen) {
    return (
      <div className="fixed right-6 bottom-6 z-50">
        <Button 
          onClick={onToggle}
          size="lg"
          className="saarthi-gradient text-white rounded-full w-16 h-16 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110"
        >
          <MessageCircle className="h-7 w-7" />
        </Button>
        
        {/* Connection status indicator */}
        <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${getStatusColor()}`} />
      </div>
    );
  }

  return (
    <div className={`fixed right-0 top-0 h-screen ${isMinimized ? 'w-80' : 'w-96'} glass-effect shadow-2xl z-40 flex flex-col transition-all duration-300`}>
      
      {/* Header */}
      <CardHeader className="border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="bg-white/20 border-2 border-white/30">
              <AvatarFallback className="text-white font-bold text-lg saarthi-gradient">
                S
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl font-bold">Saarthi</CardTitle>
              <p className="text-sm text-white/90">Your AI Assistant</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-white hover:bg-white/20 p-2"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onToggle}
              className="text-white hover:bg-white/20 p-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Status indicator */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor()}`} />
            <span className="text-xs text-white/90 font-medium">
              {getStatusText()}
            </span>
            {connectionStatus === 'connected' ? (
              <Wifi className="h-3 w-3 text-white/70" />
            ) : (
              <WifiOff className="h-3 w-3 text-white/70" />
            )}
          </div>
          
          {userProfile && (
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs">
              <User className="w-3 h-3 mr-1" />
              {userProfile.name?.split(' ')[0]}
            </Badge>
          )}
        </div>
      </CardHeader>

      {/* Progress Bar (if onboarding) */}
      {isOnboarding && (
        <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-900">Profile Setup</span>
            </div>
            <span className="text-xs text-blue-700 font-medium">{onboardingProgress}%</span>
          </div>
          
          <Progress value={onboardingProgress} className="h-2.5 mb-2" />
          
          {currentField && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-xs text-blue-800">
                Current: {getCurrentFieldLabel()}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Chat Messages */}
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            {conversation.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                      : msg.sender === 'saarthi'
                      ? 'bg-white border border-gray-200 text-gray-800 shadow-sm'
                      : 'bg-yellow-50 text-yellow-800 text-xs border border-yellow-200'
                  }`}
                >
                  {msg.message}
                  
                  {msg.sender === 'user' && (
                    <div className="text-xs opacity-75 mt-2">
                      {msg.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  )}
                  
                  {msg.sender === 'saarthi' && (
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs text-gray-500">
                        {msg.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                      {isSpeaking && (
                        <div className="flex items-center gap-1">
                          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" />
                          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Live transcript */}
            {lastTranscript && isProcessing && (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-blue-400 text-white animate-pulse border-2 border-blue-300">
                  {lastTranscript}
                  <div className="text-xs opacity-75 mt-1">Processing...</div>
                </div>
              </div>
            )}
            
            <div ref={conversationEndRef} />
          </div>
        </ScrollArea>
      </CardContent>

      {/* Voice Controls */}
      <div className="p-4 border-t bg-gray-50/80 backdrop-blur-sm">
        
        {/* Microphone permission alert */}
        {micPermission === false && (
          <Alert className="mb-3 border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-xs text-amber-800">
              🎤 Microphone access required for voice interaction
            </AlertDescription>
          </Alert>
        )}

        {/* Connection status alert */}
        {connectionStatus !== 'connected' && (
          <Alert className="mb-3 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-xs text-red-800">
              WebSocket {connectionStatus} - Some features may not work properly
            </AlertDescription>
          </Alert>
        )}

        {/* Main controls */}
        <div className="flex items-center gap-3">
          
          {/* Main voice button */}
          <Button
            onMouseDown={startVoiceRecording}
            onMouseUp={stopVoiceRecording}
            onTouchStart={startVoiceRecording}
            onTouchEnd={stopVoiceRecording}
            disabled={!micPermission || isProcessing}
            size="lg"
            className={`flex-1 font-semibold transition-all duration-200 ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 recording-glow shadow-lg' 
                : 'saarthi-gradient hover:shadow-lg'
            } text-white`}
          >
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : isRecording ? (
              <MicOff className="h-5 w-5 mr-2" />
            ) : (
              <Mic className="h-5 w-5 mr-2" />
            )}
            
            <span className="font-medium">
              {isProcessing ? 'Processing...' : 
               isRecording ? 'Release to Send' : 
               'Hold to Talk'}
            </span>
          </Button>

          {/* Speaker toggle */}
          <Button
            variant="outline"
            size="lg"
            onClick={toggleSpeaking}
            className="px-4 border-gray-300 hover:bg-gray-100"
            disabled={!voiceService.isSpeechSynthesisSupported()}
          >
            {isSpeaking ? 
              <VolumeX className="h-5 w-5 text-red-500" /> : 
              <Volume2 className="h-5 w-5 text-gray-600" />
            }
          </Button>
        </div>

        {/* User profile status */}
        {userProfile && (
          <div className="flex items-center gap-2 mt-3 p-3 bg-white rounded-lg border border-green-200 shadow-sm">
            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">
                Logged in as {userProfile.name}
              </p>
              <p className="text-xs text-gray-500">
                Profile {onboardingProgress}% complete
              </p>
            </div>
            {userProfile.attributes?.income && (
              <Badge variant="outline" className="text-xs">
                <Trophy className="w-3 h-3 mr-1" />
                ₹{userProfile.attributes.income.toLocaleString()}
              </Badge>
            )}
          </div>
        )}

        {/* Quick actions */}
        {!isOnboarding && userProfile && (
          <div className="flex gap-2 mt-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-xs"
              onClick={() => onPageChange?.('recommendations')}
            >
              <FileText className="w-3 h-3 mr-1" />
              My Schemes
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-xs"
              onClick={() => {
                profileManager.clearProfile();
                window.location.reload();
              }}
            >
              <User className="w-3 h-3 mr-1" />
              New Profile
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SaarthiSidebar;
