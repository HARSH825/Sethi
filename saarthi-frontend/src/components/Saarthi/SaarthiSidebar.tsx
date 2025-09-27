// src/components/Saarthi/SaarthiSidebar.tsx (COMPLETE FIXED VERSION - PROPER SCROLLING)

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
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micPermission, setMicPermission] = useState<boolean | null>(null);

  // User states
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [onboardingProgress, setOnboardingProgress] = useState(0);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [currentField, setCurrentField] = useState<OnboardingField | null>(null);

  // Chat states
  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const [lastTranscript, setLastTranscript] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

  // UI states
  const [isMinimized, setIsMinimized] = useState(false);

  // Refs
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Onboarding sequence
  const onboardingSequence: OnboardingField[] = ['name', 'dob', 'location', 'income', 'family_size', 'occupation', 'documents'];

  // Initialize Saarthi on component mount
  useEffect(() => {
    initializeSaarthi();
    return () => cleanup();
  }, []);

  // FIXED: Better auto-scroll implementation
  useEffect(() => {
    const scrollToBottom = () => {
      if (conversationEndRef.current) {
        conversationEndRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'end' 
        });
      }
    };
    
    // Small delay to ensure DOM has updated
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [conversation]);

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

        // Auto-speak the first message after a short delay
        setTimeout(() => {
          voiceService.speak(welcomeMessage);
          setIsSpeaking(true);
          setTimeout(() => setIsSpeaking(false), welcomeMessage.length * 40);
        }, 1000);
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
      websocketService.on('scheme-navigation-response', handleSchemeNavigationResponse);

      websocketService.on('connection-error', (data: any) => {
        console.error('❌ WebSocket connection error:', data);
        setConnectionStatus('error');
      });

      // Monitor connection status
      const connectionCheckInterval = setInterval(() => {
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

  const handleOnboardingProgress = useCallback((data: any) => {
    console.log('📝 Processing onboarding progress event:', data);
    try {
      // Prevent duplicate responses
      const existingMessage = conversation.find(msg =>
        msg.sender === 'saarthi' &&
        msg.message === data.response &&
        Math.abs(new Date(msg.timestamp).getTime() - new Date(data.timestamp).getTime()) < 2000
      );

      if (existingMessage) {
        console.log('⚠️ Duplicate response detected, skipping');
        return;
      }

      // Update progress
      if (data.progress !== undefined) {
        console.log('📊 Updating progress from', onboardingProgress, 'to', data.progress);
        setOnboardingProgress(data.progress);
      }

      // Add user message
      if (data.transcript && data.transcript.trim()) {
        console.log('👤 Adding user message:', data.transcript);
        const existingUserMessage = conversation.find(msg =>
          msg.sender === 'user' &&
          msg.message === data.transcript &&
          Math.abs(new Date(msg.timestamp).getTime() - new Date(data.timestamp).getTime()) < 5000
        );

        if (!existingUserMessage) {
          addMessage('user', data.transcript);
        }
      }

      // Add Saarthi response
      if (data.response && data.response.trim()) {
        console.log('🤖 Adding Saarthi response:', data.response);
        addMessage('saarthi', data.response);
        
        setTimeout(() => {
          voiceService.speak(data.response);
          setIsSpeaking(true);
          setTimeout(() => setIsSpeaking(false), data.response.length * 40);
        }, 500);
      }

      // Update profile
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
  }, [conversation, onboardingProgress]);

  const handleNavigationResponse = useCallback((data: any) => {
  console.log('Processing navigation response:', data);
  
  // Add user transcript to chat
  if (data.transcript && data.transcript.trim()) {
    console.log('Adding user navigation message to chat:', data.transcript);
    addMessage('user', data.transcript);
  }

  // Add Saarthi LLM response to chat
  if (data.response && data.response.trim()) {
    console.log('Adding Saarthi navigation response to chat:', data.response);
    addMessage('saarthi', data.response);
    
    // Speak the response
    setTimeout(() => {
      voiceService.speak(data.response);
      setIsSpeaking(true);
      setTimeout(() => setIsSpeaking(false), data.response.length * 40);
    }, 500);
  }

  // Handle navigation actions - FIXED
  if (data.action === "show_scheme" && data.targetScheme) {
    console.log('Navigating to scheme:', data.targetScheme);
    // Immediate navigation without delay
    onPageChange?.('scheme-details', { schemeId: data.targetScheme });
  }
}, [onPageChange]);


  // Add scheme navigation response handler
  const handleSchemeNavigationResponse = useCallback((data: any) => {
    console.log('🏛️ Processing scheme navigation response:', data);
    
    // Add user transcript to chat
    if (data.transcript && data.transcript.trim()) {
      console.log('👤 Adding user scheme query to chat:', data.transcript);
      addMessage('user', data.transcript);
    }

    // Add Saarthi scheme response to chat
    if (data.response && data.response.trim()) {
      console.log('🤖 Adding Saarthi scheme response to chat:', data.response);
      addMessage('saarthi', data.response);
      
      // Speak the response
      setTimeout(() => {
        voiceService.speak(data.response);
        setIsSpeaking(true);
        setTimeout(() => setIsSpeaking(false), data.response.length * 40);
      }, 500);
    }
  }, []);

  const completeOnboarding = async (): Promise<void> => {
    try {
      setIsProcessing(true);
      const profile = profileManager.getCachedProfile();

      if (profile) {
        console.log('💾 Saving profile to database:', profile);

        const response = await fetch('http://localhost:3001/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profile)
        });

        const userData = await response.json();
        console.log('📥 Backend response:', userData);

        if (userData.success) {
          const updatedProfile: UserProfile = { ...profile, id: userData.user.id };
          profileManager.cacheProfile(updatedProfile);
          setUserProfile(updatedProfile);

          const schemeCount = userData.recommendations?.length || 0;
          addMessage('saarthi', `🎯 Excellent! I found ${schemeCount} government schemes you're eligible for, worth potentially thousands of rupees! Taking you to your personalized recommendations now...`);

          setTimeout(() => {
            console.log('🔄 Auto-redirecting to recommendations page');
            onPageChange?.('recommendations', {
              userId: userData.user.id,
              recommendations: userData.recommendations
            });
          }, 3000);
        } else {
          throw new Error(userData.message || 'Failed to save profile');
        }
      } else {
        throw new Error('No profile data found');
      }
    } catch (error) {
      console.error('❌ Complete onboarding failed:', error);
      addMessage('saarthi', "I saved your profile locally. Let me show you some great schemes anyway!");
      
      setTimeout(() => {
        console.log('🔄 Fallback redirect to recommendations');
        onPageChange?.('recommendations', { userId: 'local' });
      }, 2000);
    } finally {
      setIsProcessing(false);
    }
  };

  // SIMPLE: Click to toggle recording
  const toggleRecording = async (): Promise<void> => {
    if (isProcessing) {
      console.log('⚠️ Currently processing, ignoring click');
      return;
    }

    if (isRecording) {
      // Stop recording
      console.log('⏹️ Stopping recording (user clicked)');
      await stopRecording();
    } else {
      // Start recording
      console.log('🎙️ Starting recording (user clicked)');
      await startRecording();
    }
  };

  // SIMPLE: Start recording function
  const startRecording = async (): Promise<void> => {
    try {
      if (!micPermission) {
        const hasPermission = await voiceService.initializeMicrophone();
        setMicPermission(hasPermission);
        if (!hasPermission) {
          addMessage('saarthi', "I need microphone access to hear you. Please click the microphone icon in your browser and allow access, then try again.");
          return;
        }
      }

      console.log('🎙️ Starting voice recording...');
      setIsRecording(true);
      await voiceService.startRecording();
      addMessage('system', '🎤 Recording... (Click microphone again to stop)');

      // Safety timeout - auto-stop after 30 seconds
      recordingTimeoutRef.current = setTimeout(() => {
        console.log('⏰ Recording timeout - auto stopping after 30 seconds');
        stopRecording();
      }, 30000);

    } catch (error) {
      console.error('❌ Start recording failed:', error);
      setIsRecording(false);
      addMessage('saarthi', "I couldn't start recording. Please check your microphone and try again.");
    }
  };

  // SIMPLE: Stop recording function
  const stopRecording = async (): Promise<void> => {
    try {
      if (!isRecording) {
        console.log('⚠️ Not recording, ignoring stop request');
        return;
      }

      console.log('⏹️ Stopping voice recording...');
      setIsRecording(false);
      setIsProcessing(true);

      // Clear timeout
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }

      // Remove the "Recording..." message
      setConversation(prev => prev.filter(msg => msg.sender !== 'system'));

      const audioBlob = await voiceService.stopRecording();

      if (audioBlob && audioBlob.size > 0) {
        console.log('🎤 Audio recorded, size:', audioBlob.size);

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

        const result = await voiceService.processAudio(audioBlob, context);
        console.log('📥 Received result from backend:', result);

        if (result.success) {
          setLastTranscript(result.transcript || '');

          const isWsConnected = websocketService.isConnected();
          console.log('🔌 WebSocket connected:', isWsConnected);

          if (!isWsConnected) {
            console.log('⚠️ WebSocket not connected, handling response directly');
            if (result.transcript) {
              addMessage('user', result.transcript);
            }

            if (result.response) {
              addMessage('saarthi', result.response);
              
              if (result.progress !== undefined) {
                setOnboardingProgress(result.progress);
              }

              if (result.extractedValue && currentField) {
                const updatedProfile = profileManager.updateProfileField(currentField, result.extractedValue);
                setUserProfile(updatedProfile);
              }

              if (result.nextField) {
                setCurrentField(result.nextField as OnboardingField);
              } else if (result.isComplete) {
                setIsOnboarding(false);
                setCurrentField(null);
                setTimeout(() => completeOnboarding(), 1000);
              }

              voiceService.speak(result.response);
              setIsSpeaking(true);
              setTimeout(() => setIsSpeaking(false), result.response.length * 40);
            }
          }
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
    
    // Clear recording timeout
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    
    // Stop recording if active
    if (isRecording) {
      setIsRecording(false);
      voiceService.stopRecording().catch(console.error);
    }
    
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
    if (isRecording) return 'Recording...';
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
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={onToggle}
          className="rounded-full w-16 h-16 bg-blue-600 hover:bg-blue-700 shadow-lg"
        >
          <MessageCircle className="w-8 h-8 text-white" />
          <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${getStatusColor()}`} />
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed right-0 top-0 h-full w-96 bg-gradient-to-br from-blue-900 to-blue-700 text-white shadow-2xl transform transition-transform duration-300 z-40 ${
      isMinimized ? 'translate-x-80' : 'translate-x-0'
    }`}>
      {/* FIXED: Proper flex container structure */}
      <div className="h-full flex flex-col">
        
        {/* FIXED: Header with explicit height */}
        <div className="flex-shrink-0 bg-blue-800/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10 bg-blue-600">
                <AvatarFallback className="bg-blue-600 text-white font-bold">
                  S
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-bold text-white">Saarthi</h3>
                <p className="text-blue-200 text-sm">Your AI Assistant</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setIsMinimized(!isMinimized)}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 p-2"
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
              {onToggle && (
                <Button
                  onClick={onToggle}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 p-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-3">
            <Badge className={`${getStatusColor()} text-white border-none`}>
              {getStatusText()}
            </Badge>
            {connectionStatus === 'connected' ? (
              <Wifi className="w-4 h-4 text-green-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400" />
            )}
            {userProfile && (
              <Badge variant="secondary" className="bg-blue-700 text-white">
                {userProfile.name?.split(' ')[0]}
              </Badge>
            )}
          </div>

          {isOnboarding && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Profile Setup</span>
                <span>{onboardingProgress}%</span>
              </div>
              <Progress value={onboardingProgress} className="bg-blue-800" />
              {currentField && (
                <p className="text-blue-200 text-xs">
                  Current: {getCurrentFieldLabel()}
                </p>
              )}
            </div>
          )}
        </div>

        {/* FIXED: Scrollable chat area - takes remaining space */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="h-full p-4">
            <div className="space-y-4">
              {conversation.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      msg.sender === 'user'
                        ? 'bg-white text-blue-900'
                        : msg.sender === 'system'
                        ? 'bg-yellow-600 text-white text-center'
                        : 'bg-blue-800 text-white'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.message}</p>
                    {msg.sender === 'user' && (
                      <p className="text-xs text-blue-600 mt-1">
                        {msg.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                    {msg.sender === 'saarthi' && (
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-blue-300">
                          {msg.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        {isSpeaking && (
                          <Volume2 className="w-3 h-3 text-green-400 animate-pulse" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {lastTranscript && isProcessing && (
                <div className="flex justify-end">
                  <div className="max-w-[80%] p-3 rounded-lg bg-gray-700 text-white">
                    <p className="text-sm">{lastTranscript}</p>
                    <p className="text-xs text-gray-300 mt-1">Processing...</p>
                  </div>
                </div>
              )}

              {/* FIXED: Scroll anchor at the bottom */}
              <div ref={conversationEndRef} className="h-2" />
            </div>
          </ScrollArea>
        </div>

        {/* FIXED: Fixed footer with controls */}
        <div className="flex-shrink-0 p-4 space-y-3 bg-blue-800/30 border-t border-blue-700/50">
          {micPermission === false && (
            <Alert className="bg-orange-600 border-orange-500 text-white">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                🎤 Microphone access required for voice interaction
              </AlertDescription>
            </Alert>
          )}

          {connectionStatus !== 'connected' && (
            <Alert className="bg-red-600 border-red-500 text-white">
              <WifiOff className="h-4 w-4" />
              <AlertDescription className="text-sm">
                WebSocket {connectionStatus} - Some features may not work properly
              </AlertDescription>
            </Alert>
          )}

          {/* FIXED: Recording controls - always visible and accessible */}
          <div className="flex items-center space-x-3">
            <Button
              onClick={toggleRecording}
              disabled={isProcessing}
              className={`flex-1 h-12 ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                  : isProcessing
                  ? 'bg-yellow-600 hover:bg-yellow-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isProcessing ? (
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
              ) : isRecording ? (
                <MicOff className="w-6 h-6 mr-2" />
              ) : (
                <Mic className="w-6 h-6 mr-2" />
              )}
              <span className="text-sm font-medium">
                {isProcessing ? 'Processing...' :
                 isRecording ? 'Click to Stop' :
                 'Click to Record'}
              </span>
            </Button>

            <Button
              onClick={toggleSpeaking}
              variant="outline"
              size="sm"
              className="bg-blue-700 border-blue-600 text-white hover:bg-blue-600"
            >
              {isSpeaking ? 
                <VolumeX className="w-4 h-4" /> : 
                <Volume2 className="w-4 h-4" />
              }
            </Button>
          </div>

          {/* User profile info */}
          {userProfile && (
            <div className="text-center">
              <p className="text-blue-200 text-xs">
                Logged in as {userProfile.name}
              </p>
              <p className="text-blue-300 text-xs">
                Profile {onboardingProgress}% complete
              </p>
              {userProfile.attributes?.income && (
                <Badge className="bg-green-600 text-white mt-1">
                  ₹{userProfile.attributes.income.toLocaleString()}
                </Badge>
              )}
            </div>
          )}

          {/* Action buttons */}
          {!isOnboarding && userProfile && (
            <div className="flex space-x-2">
              <Button
                onClick={() => onPageChange?.('recommendations')}
                variant="outline"
                size="sm"
                className="flex-1 bg-blue-700 border-blue-600 text-white hover:bg-blue-600"
              >
                <Trophy className="w-4 h-4 mr-1" />
                My Schemes
              </Button>
              <Button
                onClick={() => {
                  profileManager.clearProfile();
                  window.location.reload();
                }}
                variant="outline"
                size="sm"
                className="flex-1 bg-blue-700 border-blue-600 text-white hover:bg-blue-600"
              >
                <User className="w-4 h-4 mr-1" />
                New Profile
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SaarthiSidebar;
