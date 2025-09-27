// src/components/Forms/SimulatedGovForm.tsx - COMPLETE ENHANCED VERSION
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
  User,
  Phone,
  Mail,
  MapPin,
  IndianRupee,
  Users,
  Briefcase,
  FileText,
  Bot,
  Mic,
  MicOff,
  Check,
  AlertCircle,
  Loader2,
  Volume2,
  Sparkles,
  Clock,
  MessageSquare,
  X
} from 'lucide-react';
import voiceService from '@/services/voiceService';
import { UserProfile } from '@/types';

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'select' | 'textarea';
  required: boolean;
  placeholder?: string;
  icon: React.ReactNode;
  options?: string[];
  validation?: RegExp;
  category: 'personal' | 'contact' | 'address' | 'financial' | 'documents' | 'family';
}

interface AutoMicStatus {
  isActive: boolean;
  fieldId: string;
  prompt: string;
}

interface SimulatedGovFormProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: UserProfile | null;
  schemeTitle: string;
  schemeId: string;
}

const SimulatedGovForm: React.FC<SimulatedGovFormProps> = ({
  isOpen,
  onClose,
  userProfile,
  schemeTitle,
  schemeId
}) => {
  // Form fields configuration
  const formFields: FormField[] = [
    {
      id: 'applicant_name',
      label: 'आवेदक का नाम / Applicant Name',
      type: 'text',
      required: true,
      placeholder: 'अपना पूरा नाम दर्ज करें',
      icon: <User className="w-4 h-4" />,
      category: 'personal'
    },
    {
      id: 'father_name',
      label: 'पिता का नाम / Father\'s Name',
      type: 'text',
      required: true,
      placeholder: 'पिता का पूरा नाम दर्ज करें',
      icon: <User className="w-4 h-4" />,
      category: 'personal'
    },
    {
      id: 'mobile_number',
      label: 'मोबाइल नंबर / Mobile Number',
      type: 'tel',
      required: true,
      placeholder: '10 अंकों का मोबाइल नंबर',
      icon: <Phone className="w-4 h-4" />,
      validation: /^[6-9]\d{9}$/,
      category: 'contact'
    },
    {
      id: 'email_address',
      label: 'ईमेल पता / Email Address',
      type: 'email',
      required: true,
      placeholder: 'example@email.com',
      icon: <Mail className="w-4 h-4" />,
      category: 'contact'
    },
    {
      id: 'aadhaar_number',
      label: 'आधार संख्या / Aadhaar Number',
      type: 'text',
      required: true,
      placeholder: '12 अंकों की आधार संख्या',
      icon: <FileText className="w-4 h-4" />,
      validation: /^\d{12}$/,
      category: 'documents'
    },
    {
      id: 'pan_number',
      label: 'पैन नंबर / PAN Number',
      type: 'text',
      required: true,
      placeholder: 'ABCDE1234F',
      icon: <FileText className="w-4 h-4" />,
      validation: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
      category: 'documents'
    },
    {
      id: 'state',
      label: 'राज्य / State',
      type: 'select',
      required: true,
      placeholder: 'राज्य चुनें',
      icon: <MapPin className="w-4 h-4" />,
      options: ['Delhi', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Gujarat', 'Rajasthan', 'Uttar Pradesh', 'West Bengal'],
      category: 'address'
    },
    {
      id: 'district',
      label: 'जिला / District',
      type: 'text',
      required: true,
      placeholder: 'जिला का नाम दर्ज करें',
      icon: <MapPin className="w-4 h-4" />,
      category: 'address'
    },
    {
      id: 'pincode',
      label: 'पिन कोड / PIN Code',
      type: 'text',
      required: true,
      placeholder: '6 अंकों का पिन कोड',
      icon: <MapPin className="w-4 h-4" />,
      validation: /^\d{6}$/,
      category: 'address'
    },
    {
      id: 'annual_income',
      label: 'वार्षिक आय / Annual Income',
      type: 'number',
      required: true,
      placeholder: 'रुपये में वार्षिक आय',
      icon: <IndianRupee className="w-4 h-4" />,
      category: 'financial'
    },
    {
      id: 'family_members',
      label: 'परिवार के सदस्यों की संख्या / Family Members',
      type: 'number',
      required: true,
      placeholder: 'कुल परिवारजनों की संख्या',
      icon: <Users className="w-4 h-4" />,
      category: 'family'
    },
    {
      id: 'occupation',
      label: 'व्यवसाय / Occupation',
      type: 'text',
      required: true,
      placeholder: 'आपका मुख्य व्यवसाय',
      icon: <Briefcase className="w-4 h-4" />,
      category: 'personal'
    }
  ];

  // States
  const [formData, setFormData] = useState<{ [key: string]: string }>({});
  const [autoFillProgress, setAutoFillProgress] = useState(0);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [currentAutoFillField, setCurrentAutoFillField] = useState<string>('');
  const [autoMicStatus, setAutoMicStatus] = useState<AutoMicStatus>({
    isActive: false,
    fieldId: '',
    prompt: ''
  });
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  const autoFillTimeoutRef = useRef<NodeJS.Timeout>();
  const fieldRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement | null }>({});

  // Helper functions
  const getDefaultValue = (fieldId: string): string => {
    const defaults: { [key: string]: string } = {
      applicant_name: 'राज कुमार शर्मा',
      father_name: 'श्रीकृष्ण शर्मा',
      mobile_number: '9876543210',
      email_address: 'raj.sharma@email.com',
      aadhaar_number: '123456789012',
      pan_number: 'ABCDE1234F',
      state: 'Delhi',
      district: 'South Delhi',
      pincode: '110001',
      annual_income: '500000',
      family_members: '4',
      occupation: 'सरकारी नौकरी'
    };
    return defaults[fieldId] || '';
  };

  const getAutoFillValue = (field: FormField, profile?: UserProfile | null): string => {
    if (!profile) return getDefaultValue(field.id);

    const attributes = profile.attributes || {};
    const location = profile.location || profile.address || {};
    
    switch (field.id) {
      case 'applicant_name':
        return profile.name || profile.fullName || 'राज कुमार शर्मा';
      case 'father_name':
        return attributes.fatherName || profile.fatherName || 'श्रीकृष्ण शर्मा';
      case 'mobile_number':
        return profile.phone || profile.mobile || attributes.phone || '9876543210';
      case 'email_address':
        return profile.email || attributes.email || 'user@example.com';
      case 'aadhaar_number':
        return attributes.aadhaar || profile.aadhaar || '123456789012';
      case 'pan_number':
        return attributes.pan || profile.pan || 'ABCDE1234F';
      case 'state':
        return location.state || profile.state || attributes.state || 'Delhi';
      case 'district':
        return location.district || profile.district || attributes.district || 'South Delhi';
      case 'pincode':
        return location.pincode || profile.pincode || attributes.pincode || '110001';
      case 'annual_income':
        const monthlyIncome = profile.income || attributes.income || attributes.monthlyIncome;
        if (monthlyIncome) {
          const annual = typeof monthlyIncome === 'number' ? monthlyIncome * 12 : parseInt(monthlyIncome) * 12;
          return annual.toString();
        }
        return '500000';
      case 'family_members':
        return attributes.familySize || profile.familySize || attributes.familyMembers || '4';
      case 'occupation':
        return profile.occupation || attributes.occupation || profile.profession || 'सरकारी नौकरी';
      default:
        return getDefaultValue(field.id);
    }
  };

  const validateField = (field: FormField, value: string): string | null => {
    if (field.required && !value.trim()) {
      return `${field.label} आवश्यक है`;
    }

    if (value && field.validation && !field.validation.test(value)) {
      switch (field.id) {
        case 'mobile_number':
          return 'वैध 10 अंकों का मोबाइल नंबर दर्ज करें';
        case 'aadhaar_number':
          return 'वैध 12 अंकों की आधार संख्या दर्ज करें';
        case 'pan_number':
          return 'वैध पैन नंबर दर्ज करें (जैसे: ABCDE1234F)';
        case 'pincode':
          return 'वैध 6 अंकों का पिन कोड दर्ज करें';
        default:
          return 'अवैध प्रारूप';
      }
    }

    return null;
  };

  const typeInField = (fieldId: string, value: string, delay: number = 100): Promise<void> => {
    return new Promise((resolve) => {
      const field = fieldRefs.current[fieldId];
      if (!field) {
        resolve();
        return;
      }

      // Focus and scroll to field
      field.focus();
      field.scrollIntoView({ behavior: 'smooth', block: 'center' });

      let currentIndex = 0;
      
      const typeChar = () => {
        if (currentIndex < value.length) {
          const currentValue = value.substring(0, currentIndex + 1);
          
          // Simulate human typing
          setFormData(prev => ({ ...prev, [fieldId]: currentValue }));
          
          if (field.type === 'select') {
            // For select fields, just set the value directly
            setFormData(prev => ({ ...prev, [fieldId]: value }));
            resolve();
          } else {
            field.value = currentValue;
            currentIndex++;
            
            // Variable typing speed to simulate human behavior
            const randomDelay = delay + Math.random() * 50;
            setTimeout(typeChar, randomDelay);
          }
        } else {
          resolve();
        }
      };

      typeChar();
    });
  };

  const startAutoFill = async () => {
    console.log('🤖 Starting auto-fill process');
    setIsAutoFilling(true);
    setAutoFillProgress(0);
    setCurrentAutoFillField('');

    try {
      const fieldsToFill = formFields.filter(field => {
        const autoValue = getAutoFillValue(field, userProfile);
        return autoValue && autoValue !== getDefaultValue(field.id);
      });

      console.log(`📝 Found ${fieldsToFill.length} fields to auto-fill`);

      for (let i = 0; i < fieldsToFill.length; i++) {
        const field = fieldsToFill[i];
        const value = getAutoFillValue(field, userProfile);
        
        console.log(`✍️ Auto-filling ${field.id}: ${value}`);
        setCurrentAutoFillField(field.id);
        
        await typeInField(field.id, value, 80);
        
        // Update progress
        const progress = ((i + 1) / fieldsToFill.length) * 100;
        setAutoFillProgress(progress);
        
        // Pause between fields
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Check for missing required fields
      const missing = formFields
        .filter(field => field.required && !formData[field.id] && !getAutoFillValue(field, userProfile))
        .map(field => field.id);

      setMissingFields(missing);

      if (missing.length > 0) {
        console.log(`❓ Found ${missing.length} missing required fields`);
        // Start voice collection for missing fields
        await collectMissingFieldsWithVoice(missing);
      } else {
        console.log('✅ All fields filled successfully');
        // Speak completion message
        voiceService.speak('सभी फ़ील्ड सफलतापूर्वक भर दिए गए हैं। आप अब फॉर्म सबमिट कर सकते हैं।');
      }

    } catch (error) {
      console.error('❌ Auto-fill error:', error);
    } finally {
      setIsAutoFilling(false);
      setCurrentAutoFillField('');
    }
  };

  const collectMissingFieldsWithVoice = async (missingFieldIds: string[]) => {
    for (const fieldId of missingFieldIds) {
      const field = formFields.find(f => f.id === fieldId);
      if (!field) continue;

      try {
        console.log(`🎤 Collecting voice input for: ${field.label}`);
        
        const prompt = `मुझे ${field.label} की जानकारी चाहिए। कृपया बताएं।`;
        
        // Speak the prompt
        await voiceService.speak(prompt);
        
        // Set mic status
        setAutoMicStatus({
          isActive: true,
          fieldId: fieldId,
          prompt: prompt
        });

        // Start listening
        const transcript = await voiceService.startListening();
        
        if (transcript && transcript.trim()) {
          console.log(`📝 Voice input received for ${fieldId}: ${transcript}`);
          
          // Process and clean the transcript
          let processedValue = transcript.trim();
          
          // Apply specific processing for different field types
          if (field.type === 'number') {
            // Extract numbers from voice input
            const numbers = processedValue.match(/\d+/g);
            if (numbers) {
              processedValue = numbers.join('');
            }
          }
          
          // Type the value into the field
          await typeInField(fieldId, processedValue);
          
          // Confirm with user
          await voiceService.speak(`${field.label}: ${processedValue} - दर्ज किया गया।`);
        }

      } catch (error) {
        console.error(`Voice collection error for ${fieldId}:`, error);
        await voiceService.speak(`${field.label} के लिए आवाज़ की पहचान में समस्या हुई। कृपया मैन्युअल रूप से भरें।`);
      } finally {
        setAutoMicStatus({
          isActive: false,
          fieldId: '',
          prompt: ''
        });
      }
    }
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};
    
    formFields.forEach(field => {
      const error = validateField(field, formData[field.id] || '');
      if (error) {
        errors[field.id] = error;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitForm = async () => {
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log('📤 Submitting form data:', formData);
      
      // Simulate form submission
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setSubmissionStatus('success');
      await voiceService.speak('आपका आवेदन सफलतापूर्वक सबमिट हो गया है। आवेदन संख्या आपको ईमेल और SMS द्वारा भेजी जाएगी।');
      
      // Close form after delay
      setTimeout(() => {
        onClose();
      }, 4000);
      
    } catch (error) {
      console.error('❌ Form submission error:', error);
      setSubmissionStatus('error');
      await voiceService.speak('फॉर्म सबमिट करने में समस्या हुई। कृपया दोबारा कोशिश करें।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldChange = (fieldId: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    
    // Clear validation error for this field
    if (validationErrors[fieldId]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const groupFieldsByCategory = () => {
    const groups: { [key: string]: FormField[] } = {};
    
    formFields.forEach(field => {
      if (!groups[field.category]) {
        groups[field.category] = [];
      }
      groups[field.category].push(field);
    });
    
    return groups;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'personal': return <User className="w-5 h-5" />;
      case 'contact': return <Phone className="w-5 h-5" />;
      case 'address': return <MapPin className="w-5 h-5" />;
      case 'financial': return <IndianRupee className="w-5 h-5" />;
      case 'documents': return <FileText className="w-5 h-5" />;
      case 'family': return <Users className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'personal': return 'व्यक्तिगत जानकारी';
      case 'contact': return 'संपर्क विवरण';
      case 'address': return 'पता विवरण';
      case 'financial': return 'आर्थिक जानकारी';
      case 'documents': return 'दस्तावेज विवरण';
      case 'family': return 'पारिवारिक जानकारी';
      default: return 'अन्य जानकारी';
    }
  };

  const renderField = (field: FormField) => {
    const hasError = validationErrors[field.id];
    const isCurrentlyFilling = currentAutoFillField === field.id;
    const value = formData[field.id] || '';

    return (
      <div key={field.id} className={`space-y-2 ${isCurrentlyFilling ? 'ring-2 ring-blue-400 ring-opacity-50 rounded-lg p-2' : ''}`}>
        <Label htmlFor={field.id} className="flex items-center space-x-2">
          {field.icon}
          <span className={field.required ? "after:content-['*'] after:text-red-500" : ""}>
            {field.label}
          </span>
          {isCurrentlyFilling && (
            <Badge variant="secondary" className="ml-2">
              <Bot className="w-3 h-3 mr-1" />
              Filling...
            </Badge>
          )}
        </Label>
        
        {field.type === 'select' ? (
          <Select value={value} onValueChange={(val) => handleFieldChange(field.id, val)}>
            <SelectTrigger className={hasError ? 'border-red-500' : ''}>
              <SelectValue placeholder={field.placeholder} />
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
            ref={(el) => fieldRefs.current[field.id] = el}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className={hasError ? 'border-red-500' : ''}
            rows={3}
          />
        ) : (
          <Input
            id={field.id}
            ref={(el) => fieldRefs.current[field.id] = el}
            type={field.type}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className={hasError ? 'border-red-500' : ''}
          />
        )}
        
        {hasError && (
          <p className="text-sm text-red-600 flex items-center">
            <AlertCircle className="w-4 h-4 mr-1" />
            {hasError}
          </p>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <Card className="border-0 shadow-none">
          <CardHeader className="border-b bg-gradient-to-r from-blue-600 to-green-600 text-white">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl flex items-center">
                  <FileText className="w-6 h-6 mr-2" />
                  {schemeTitle} - आवेदन पत्र
                </CardTitle>
                <p className="text-blue-100 mt-1">Application Form</p>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {/* Auto-fill Section */}
            {!isAutoFilling && !isSubmitting && submissionStatus === 'idle' && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-blue-900 flex items-center">
                    <Sparkles className="w-5 h-5 mr-2" />
                    Smart Auto-Fill Available
                  </h3>
                  <Button onClick={startAutoFill} className="bg-blue-600 hover:bg-blue-700">
                    <Bot className="w-4 h-4 mr-2" />
                    Auto-Fill Form
                  </Button>
                </div>
                <p className="text-sm text-blue-700">
                  Saarthi can automatically fill this form using your profile information. 
                  Missing information will be collected via voice input.
                </p>
              </div>
            )}

            {/* Auto-fill Progress */}
            {isAutoFilling && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center mb-3">
                  <Bot className="w-5 h-5 mr-2 text-green-600" />
                  <span className="font-semibold text-green-900">Auto-filling form...</span>
                </div>
                <Progress value={autoFillProgress} className="mb-2" />
                <p className="text-sm text-green-700">
                  {currentAutoFillField ? `Filling: ${formFields.find(f => f.id === currentAutoFillField)?.label}` : 'Processing...'}
                </p>
              </div>
            )}

            {/* Voice Input Status */}
            {autoMicStatus.isActive && (
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <Mic className="w-5 h-5 mr-2 text-orange-600 animate-pulse" />
                  <span className="font-semibold text-orange-900">Voice Input Active</span>
                </div>
                <p className="text-sm text-orange-700">{autoMicStatus.prompt}</p>
                <p className="text-xs text-orange-600 mt-1">Speak clearly and press the stop button when done</p>
              </div>
            )}

            {/* Submission Status */}
            {submissionStatus === 'success' && (
              <Alert className="mb-6 bg-green-50 border-green-200">
                <Check className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Success!</strong> Your application has been submitted successfully. 
                  Application number will be sent to your email and mobile.
                </AlertDescription>
              </Alert>
            )}

            {submissionStatus === 'error' && (
              <Alert className="mb-6 bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Error!</strong> There was a problem submitting your application. 
                  Please try again.
                </AlertDescription>
              </Alert>
            )}

            {/* Form Fields */}
            {submissionStatus === 'idle' && (
              <div className="space-y-8">
                {Object.entries(groupFieldsByCategory()).map(([category, fields]) => (
                  <div key={category} className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center border-b pb-2">
                      {getCategoryIcon(category)}
                      <span className="ml-2">{getCategoryTitle(category)}</span>
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {fields.map(renderField)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Form Actions */}
            {submissionStatus === 'idle' && (
              <div className="mt-8 pt-6 border-t">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    onClick={submitForm}
                    disabled={isSubmitting || isAutoFilling}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Submit Application
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={onClose}
                    disabled={isSubmitting || isAutoFilling}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
                
                <p className="text-xs text-gray-500 mt-4 text-center">
                  By submitting this form, you agree to the terms and conditions of {schemeTitle}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SimulatedGovForm;
