// src/components/Pages/SchemeDetailsPage.tsx - COMPLETE UPDATED VERSION WITH ENGLISH DATA AND ELIGIBLE TAGS
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
import SimulatedGovForm from '@/components/Forms/SimulatedGovForm';

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
  const [scheme, setScheme] = useState<Scheme | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [personalizedExplanation, setPersonalizedExplanation] = useState<string>('');
  
  // Voice interaction states
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceResponse, setVoiceResponse] = useState<string>('');
  const [lastTranscript, setLastTranscript] = useState<string>('');
  
  // Form states - NEW
  const [showApplicationForm, setShowApplicationForm] = useState(false);

  const currentSchemeId = schemeId || pageData?.schemeId || 'pmay-2024';
  const wsRef = useRef<WebSocket | null>(null);

  // Updated schemes data - ALL IN ENGLISH with ELIGIBLE tags
  const schemes: { [key: string]: Scheme } = {
    'pmay-2024': {
      id: 'pmay-2024',
      title: 'Pradhan Mantri Awas Yojana (Urban)',
      englishTitle: 'Prime Minister Housing Scheme (Urban)',
      description: 'This scheme provides affordable housing for economically weaker sections, lower income groups, and middle income groups in urban areas. The mission aims to provide housing for all by 2022 through four verticals: in-situ slum redevelopment, credit linked subsidy, affordable housing in partnership, and beneficiary-led individual house construction.',
      englishDescription: 'Comprehensive urban housing scheme providing subsidized homes and credit facilities for eligible families.',
      benefits: [
        'Home loan subsidy up to ₹2.67 lakh',
        'Direct financial assistance for house construction',
        'Subsidized land use rates',
        'Central nodal agency support',
        'Interest subsidy on home loans',
        'Priority allocation for women beneficiaries'
      ],
      eligibility: [
        'Indian citizen with valid documents',
        'Family annual income less than ₹18 lakh',
        'Should not own any pucca house',
        'Should not be a government employee',
        'Age between 21-55 years for loan applicants',
        'Valid bank account and Aadhaar linking'
      ],
      documents: [
        'Aadhaar Card (mandatory)',
        'PAN Card',
        'Income Certificate',
        'Residence Proof',
        'Bank Passbook',
        'Passport Size Photos',
        'Property Documents (if any)',
        'Employment Certificate'
      ],
      applicationFee: '₹100',
      processingTime: '60-90 days',
      category: 'Housing',
      targetAudience: 'Urban Low Income Families',
      applicationDeadline: '31st March 2025',
      officialWebsite: 'https://pmaymis.gov.in/',
      helplineNumber: '1800-11-3388',
      isEligible: true, // NEW: Eligible tag
      eligibilityScore: 95 // NEW: High eligibility score
    },
    'pm-kisan': {
      id: 'pm-kisan',
      title: 'PM Kisan Samman Nidhi Yojana',
      englishTitle: 'Prime Minister Farmer Honor Fund Scheme',
      description: 'Under this scheme, eligible small and marginal farmers receive financial assistance of ₹6,000 per year in three equal installments directly transferred to their bank accounts. The scheme aims to supplement financial needs of farmers in procuring inputs and ensuring proper crop health and appropriate yields.',
      englishDescription: 'Direct income support scheme providing ₹6,000 annually to small and marginal farmers.',
      benefits: [
        '₹6,000 annual financial assistance',
        'Three installments of ₹2,000 each',
        'Direct bank transfer (DBT)',
        'No application fee required',
        'Immediate financial relief',
        'Support for agricultural inputs'
      ],
      eligibility: [
        'Small and marginal farmers only',
        'Cultivable land up to 2 hectares',
        'Indian citizenship mandatory',
        'Agriculture as primary income source',
        'Valid land ownership documents',
        'Active bank account with Aadhaar linking'
      ],
      documents: [
        'Aadhaar Card (compulsory)',
        'Land ownership documents',
        'Bank passbook with IFSC',
        'Farmer ID/Registration',
        'Mobile number (registered)',
        'Passport size photograph',
        'Income certificate (if required)',
        'Caste certificate (if applicable)'
      ],
      applicationFee: 'Free of cost',
      processingTime: '30-45 days',
      category: 'Agriculture',
      targetAudience: 'Small & Marginal Farmers',
      applicationDeadline: 'Open throughout the year',
      officialWebsite: 'https://pmkisan.gov.in/',
      helplineNumber: '155261',
      isEligible: true, // NEW: Eligible tag
      eligibilityScore: 88 // NEW: Good eligibility score
    },
    'ayushman-bharat': {
      id: 'ayushman-bharat',
      title: 'Ayushman Bharat - Pradhan Mantri Jan Arogya Yojana',
      englishTitle: 'Ayushman Bharat - PM Health Assurance Scheme',
      description: 'Ayushman Bharat is a flagship scheme that provides health insurance coverage of up to ₹5 lakh per family per year for secondary and tertiary care hospitalization. The scheme aims to achieve universal health coverage and focuses on providing financial risk protection against catastrophic health expenditure.',
      englishDescription: 'Universal health insurance scheme providing ₹5 lakh annual coverage for eligible families.',
      benefits: [
        'Health insurance coverage up to ₹5 lakh annually',
        'Covers over 1,400 medical procedures',
        'Cashless treatment at empaneled hospitals',
        'Coverage for pre-existing conditions',
        'No restrictions on family size or age',
        'Portable across all states in India'
      ],
      eligibility: [
        'Based on Socio-Economic Caste Census (SECC) 2011',
        'Families with annual income below ₹5 lakh',
        'Rural families as per SECC database',
        'Urban families meeting occupational criteria',
        'Automatic inclusion for RSBY beneficiaries',
        'No age limit for family members'
      ],
      documents: [
        'Aadhaar Card of all family members',
        'Ration Card (BPL/APL)',
        'Income Certificate',
        'SECC verification documents',
        'Mobile number (registered)',
        'Bank account details',
        'Passport size photos',
        'Address proof documents'
      ],
      applicationFee: 'Completely free',
      processingTime: '15-30 days',
      category: 'Healthcare',
      targetAudience: 'Below Poverty Line Families',
      applicationDeadline: 'Ongoing enrollment',
      officialWebsite: 'https://pmjay.gov.in/',
      helplineNumber: '14555',
      isEligible: true, // NEW: Eligible tag
      eligibilityScore: 92 // NEW: High eligibility score
    },
    'mudra-loan': {
      id: 'mudra-loan',
      title: 'Pradhan Mantri MUDRA Yojana',
      englishTitle: 'Prime Minister Micro Units Development & Refinance Agency',
      description: 'MUDRA provides funding to non-corporate, non-farm small/micro enterprises under three categories: Shishu (up to ₹50,000), Kishore (₹50,001 to ₹5 lakh), and Tarun (₹5,00,001 to ₹10 lakh). The scheme aims to provide easy access to credit for small business owners and entrepreneurs.',
      englishDescription: 'Micro-finance scheme providing business loans up to ₹10 lakh for small enterprises.',
      benefits: [
        'Business loans up to ₹10 lakh',
        'No collateral required for loans up to ₹10 lakh',
        'Flexible repayment terms',
        'Support for existing and new businesses',
        'Coverage for trading, manufacturing, and services',
        'Special focus on women entrepreneurs'
      ],
      eligibility: [
        'Indian citizen above 18 years',
        'Non-corporate, non-farm enterprises',
        'Existing or new micro/small enterprises',
        'Good credit history preferred',
        'Valid business plan or proposal',
        'Should not be defaulter of any bank'
      ],
      documents: [
        'Aadhaar Card and PAN Card',
        'Business registration documents',
        'Bank statements (6 months)',
        'Income proof and IT returns',
        'Address proof (business & residential)',
        'Passport size photographs',
        'Business plan/project report',
        'Quotations for machinery/equipment'
      ],
      applicationFee: 'No processing fee',
      processingTime: '15-45 days',
      category: 'Business & Finance',
      targetAudience: 'Micro Entrepreneurs',
      applicationDeadline: 'Available year-round',
      officialWebsite: 'https://mudra.org.in/',
      helplineNumber: '1800-180-1111',
      isEligible: true, // NEW: Eligible tag
      eligibilityScore: 85 // NEW: Good eligibility score
    },
    'jan-dhan': {
      id: 'jan-dhan',
      title: 'Pradhan Mantri Jan Dhan Yojana',
      englishTitle: 'Prime Minister People\'s Wealth Scheme',
      description: 'Jan Dhan Yojana is a financial inclusion program that aims to provide affordable access to financial services such as banking, savings, deposit accounts, remittance, credit, insurance, and pension to the excluded sections of society.',
      englishDescription: 'Financial inclusion scheme providing banking services to all households.',
      benefits: [
        'Zero balance bank account opening',
        'RuPay debit card with accident insurance',
        'Life insurance cover of ₹30,000',
        'Accident insurance cover of ₹2 lakh',
        'Overdraft facility up to ₹10,000',
        'Direct benefit transfer (DBT) facility'
      ],
      eligibility: [
        'All Indian citizens',
        'No minimum balance requirement',
        'Age above 10 years for account opening',
        'Valid identity proof required',
        'Address verification mandatory',
        'One account per individual'
      ],
      documents: [
        'Aadhaar Card (preferred)',
        'Voter ID Card',
        'Driving License',
        'NREGA Job Card',
        'Passport (if available)',
        'Passport size photographs',
        'Address proof documents',
        'Mobile number for linking'
      ],
      applicationFee: 'Absolutely free',
      processingTime: 'Same day account opening',
      category: 'Banking & Finance',
      targetAudience: 'All Indian Citizens',
      applicationDeadline: 'Ongoing scheme',
      officialWebsite: 'https://pmjdy.gov.in/',
      helplineNumber: '1800-11-0001',
      isEligible: true, // NEW: Eligible tag
      eligibilityScore: 98 // NEW: Very high eligibility score
    }
  };

  useEffect(() => {
    loadSchemeData();
    loadUserProfile();
  }, [currentSchemeId]);

  const loadSchemeData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const schemeData = schemes[currentSchemeId];
      if (schemeData) {
        setScheme(schemeData);
        console.log('📄 Scheme loaded:', schemeData.title);
      } else {
        setError(`Scheme with ID "${currentSchemeId}" not found`);
      }
    } catch (err) {
      console.error('Error loading scheme:', err);
      setError('Failed to load scheme details');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      const profile = await profileManager.initializeProfile();
      setUserProfile(profile);
      
      if (profile && scheme) {
        generatePersonalizedExplanation(profile, scheme);
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
    }
  };

  const generatePersonalizedExplanation = (profile: UserProfile, scheme: Scheme) => {
    const explanations = [];
    
    if (profile.income && scheme.id === 'pmay-2024') {
      const monthlyIncome = typeof profile.income === 'number' ? profile.income : parseInt(profile.income);
      if (monthlyIncome < 150000) {
        explanations.push(`Your annual income of ₹${monthlyIncome} makes you eligible for this housing scheme.`);
      }
    }
    
    if (profile.income && scheme.id === 'pm-kisan') {
      explanations.push(`As a farmer, you can receive ₹6,000 annually through this scheme.`);
    }
    
    if (profile.location?.state) {
      explanations.push(`This scheme is actively running in ${profile.location.state} state.`);
    }
    
    if (profile.attributes?.familySize) {
      explanations.push(`This scheme is suitable for families with ${profile.attributes.familySize} members.`);
    }

    // Add eligibility score information
    if (scheme.isEligible && scheme.eligibilityScore) {
      explanations.push(`You have a ${scheme.eligibilityScore}% eligibility match for this scheme.`);
    }
    
    setPersonalizedExplanation(explanations.join(' '));
  };

  // NEW: Apply button handler
  const handleApplyClick = async (): Promise<void> => {
    console.log('🚀 Starting application process for scheme:', scheme?.title);
    
    // Load user profile from local storage
    const currentUserProfile = await profileManager.initializeProfile();
    console.log('👤 User profile loaded for form:', currentUserProfile?.name);
    
    // Open the form
    setShowApplicationForm(true);
    
    // Optional: Speak confirmation
    if (voiceService) {
      try {
        await voiceService.speak(`Opening application form for ${scheme?.title}. I'll help you fill it automatically.`);
      } catch (error) {
        console.warn('TTS failed:', error);
      }
    }
  };

  // NEW: Form close handler
  const handleCloseApplicationForm = (): void => {
    setShowApplicationForm(false);
    console.log('📝 Application form closed');
  };

  const startVoiceInteraction = async () => {
    if (isVoiceActive || isProcessing || isSpeaking) return;
    
    try {
      setIsVoiceActive(true);
      setVoiceResponse('');
      setLastTranscript('');
      console.log('🎤 Starting voice interaction for scheme details');
      
      const transcript = await voiceService.startListening();
      console.log('📝 Voice transcript received:', transcript);
      
      if (transcript && transcript.trim()) {
        setLastTranscript(transcript);
        setIsVoiceActive(false);
        setIsProcessing(true);
        
        // Send to backend for processing
        const response = await sendSchemeQuery(transcript, currentSchemeId);
        
        if (response && response.trim()) {
          setVoiceResponse(response);
          console.log('🤖 Saarthi response:', response);
          
          // Speak the response
          setTimeout(async () => {
            try {
              setIsSpeaking(true);
              await voiceService.speak(response);
            } catch (error) {
              console.warn('TTS failed:', error);
            } finally {
              setIsSpeaking(false);
            }
          }, 500);
        }
      }
    } catch (error) {
      console.error('Voice interaction error:', error);
      setVoiceResponse('Sorry, there was an issue with voice recognition. Please try again.');
    } finally {
      setIsVoiceActive(false);
      setIsProcessing(false);
    }
  };

  const stopVoiceInteraction = () => {
    console.log('⏹️ Stopping voice interaction');
    voiceService.stopListening();
    setIsVoiceActive(false);
    setIsProcessing(false);
    setLastTranscript('');
  };

  const sendSchemeQuery = async (query: string, schemeId: string): Promise<string> => {
    try {
      const queryData = {
        query,
        schemeId,
        userId: userProfile?.id || 'anonymous',
        context: 'scheme_details'
      };
      
      console.log('📤 Sending scheme query:', queryData);
      
      // Updated mock responses in English
      const mockResponses = [
        `To apply for ${scheme?.title}, you will need documents like ${scheme?.documents.slice(0, 3).join(', ')}.`,
        `Under this scheme, you can benefit from ${scheme?.benefits[0]}.`,
        `The application process typically takes ${scheme?.processingTime} to complete.`,
        `The application fee for ${scheme?.title} is ${scheme?.applicationFee}.`,
        `This scheme has a ${scheme?.eligibilityScore || 90}% match with your profile, making you highly eligible.`
      ];
      
      return mockResponses[Math.floor(Math.random() * mockResponses.length)];
    } catch (error) {
      console.error('Error sending scheme query:', error);
      return 'Sorry, I am having trouble getting information at the moment. Please try again.';
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 bg-gray-50">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Loading scheme details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (error || !scheme) {
    return (
      <div className="flex-1 p-6 bg-gray-50">
        <div className="max-w-4xl mx-auto space-y-6">
          <Button 
            onClick={() => onPageChange('recommendations')} 
            variant="ghost" 
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Recommendations
          </Button>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || 'Scheme not found'}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 bg-gray-50">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button 
            onClick={() => onPageChange('recommendations')} 
            variant="ghost"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Recommendations
          </Button>
          
          <div className="flex space-x-2">
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {scheme.category}
            </Badge>
            {/* NEW: Eligible badge */}
            {scheme.isEligible && (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                ✓ Eligible
              </Badge>
            )}
          </div>
        </div>

        {/* Voice Interaction Section */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <MessageCircle className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">Ask Saarthi about this scheme</span>
              </div>
              
              <div className="flex space-x-2">
                {isVoiceActive ? (
                  <Button 
                    onClick={stopVoiceInteraction}
                    variant="destructive" 
                    size="sm"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop
                  </Button>
                ) : (
                  <Button 
                    onClick={startVoiceInteraction}
                    disabled={isProcessing || isSpeaking}
                    className="bg-blue-600 hover:bg-blue-700"
                    size="sm"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : isSpeaking ? (
                      <Volume2 className="w-4 h-4 mr-2" />
                    ) : (
                      <Mic className="w-4 h-4 mr-2" />
                    )}
                    {isProcessing ? 'Processing...' : isSpeaking ? 'Speaking...' : 'Ask Question'}
                  </Button>
                )}
              </div>
            </div>
            
            <p className="text-sm text-blue-700 mb-3">
              {isVoiceActive ? 'Listening... (Click Stop to finish early)' : 
               isProcessing ? 'Processing your question...' : 
               isSpeaking ? 'Saarthi is responding...' : 
               'Try: "How do I apply?" or "What documents do I need?"'}
            </p>
            
            {lastTranscript && (
              <div className="text-sm bg-white p-2 rounded border mb-2">
                <strong>You asked:</strong> {lastTranscript}
              </div>
            )}
            
            {voiceResponse && (
              <div className="text-sm bg-white p-2 rounded border">
                <strong>Saarthi:</strong> {voiceResponse}
                {isSpeaking && (
                  <Volume2 className="w-4 h-4 inline ml-2 text-blue-600" />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scheme Details */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl text-gray-900 mb-2">
                  {scheme.title}
                </CardTitle>
                <p className="text-gray-600 italic mb-4">
                  {scheme.englishTitle}
                </p>
              </div>
              <div className="flex flex-col space-y-2">
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  Active
                </Badge>
                {/* NEW: Eligibility Score Badge */}
                {scheme.eligibilityScore && (
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                    {scheme.eligibilityScore}% Match
                  </Badge>
                )}
              </div>
            </div>
            
            {personalizedExplanation && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Why this is relevant for you:</strong><br />
                  {personalizedExplanation}
                </AlertDescription>
              </Alert>
            )}
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-3">Scheme Description</h3>
              <p className="text-gray-700 leading-relaxed">
                {scheme.description}
              </p>
            </div>

            <Separator />

            {/* Benefits */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                Key Benefits
              </h3>
              <ul className="space-y-2">
                {scheme.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="w-4 h-4 mr-2 mt-1 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            {/* Eligibility */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                Eligibility Criteria
              </h3>
              <ul className="space-y-2">
                {scheme.eligibility.map((criteria, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="w-4 h-4 mr-2 mt-1 text-blue-500 flex-shrink-0" />
                    <span className="text-gray-700">{criteria}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            {/* Required Documents */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-orange-600" />
                Required Documents
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {scheme.documents.map((doc, index) => (
                  <div key={index} className="flex items-center p-2 bg-gray-50 rounded">
                    <FileText className="w-4 h-4 mr-2 text-gray-500" />
                    <span className="text-gray-700">{doc}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Quick Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <DollarSign className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <p className="text-sm text-gray-600">Application Fee</p>
                <p className="font-semibold text-blue-900">{scheme.applicationFee}</p>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Calendar className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <p className="text-sm text-gray-600">Processing Time</p>
                <p className="font-semibold text-green-900">{scheme.processingTime}</p>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <MapPin className="w-6 h-6 mx-auto mb-2 text-orange-600" />
                <p className="text-sm text-gray-600">Target Audience</p>
                <p className="font-semibold text-orange-900">{scheme.targetAudience}</p>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Calendar className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                <p className="text-sm text-gray-600">Deadline</p>
                <p className="font-semibold text-purple-900">{scheme.applicationDeadline}</p>
              </div>
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* UPDATED: Apply Button with handler */}
              <Button 
                onClick={handleApplyClick}
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={isLoading || !scheme}
              >
                <FileText className="w-4 h-4 mr-2" />
                Start Application
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.open(scheme.officialWebsite, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Official Website
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.open(`tel:${scheme.helplineNumber}`)}
              >
                <Users className="w-4 h-4 mr-2" />
                Helpline: {scheme.helplineNumber}
              </Button>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Saarthi will help you fill the form automatically using your profile data!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* NEW: Application Form Modal */}
        {showApplicationForm && (
          <SimulatedGovForm
            isOpen={showApplicationForm}
            onClose={handleCloseApplicationForm}
            userProfile={userProfile}
            schemeTitle={scheme?.title || 'Government Scheme'}
            schemeId={currentSchemeId || 'UNKNOWN'}
          />
        )}
      </div>
    </div>
  );
};

export default SchemeDetailsPage;