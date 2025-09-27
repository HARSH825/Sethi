// src/types/index.ts
export interface UserProfile {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
  dob?: string;
  location?: {
    state: string;
    district: string;
    pincode?: string;
  };
  income?: number;
  family_size?: number;
  occupation?: string;
  documents?: {
    aadhaar?: boolean;
    pan?: boolean;
    bank_account?: boolean;
    income_certificate?: boolean;
    caste_certificate?: boolean;
  };
  attributes?: {
    is_farmer?: boolean;
    is_senior?: boolean;
    has_disability?: boolean;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Scheme {
  id: string;
  title: string;
  description: string;
  agency: string;
  eligibilityCriteria: {
    min_income?: number;
    max_income?: number;
    min_age?: number;
    max_age?: number;
    states?: string[];
    required_documents?: string[];
    is_farmer?: boolean;
    family_based?: boolean;
  };
  requiredDocuments: string[];
  applicationUrl: string;
  tags: string[];
  state: string;
  benefitAmount: number;
  priority: number;
  isActive: boolean;
  deadline?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SchemeRecommendation extends Scheme {
  relevanceScore: number;
  eligibilityStatus: {
    eligible: boolean;
    status: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'PARTIALLY_ELIGIBLE';
    reasons: string[];
    confidence: number;
  };
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'saarthi' | 'system';
  message: string;
  timestamp: Date;
  metadata?: {
    transcript?: string;
    confidence?: number;
    intent?: string;
    entities?: Record<string, any>;
  };
}

export interface VoiceProcessingResult {
  success: boolean;
  transcript?: string;
  extractedValue?: any;
  confidence?: number;
  needsConfirmation?: boolean;
  response?: string;
  nextField?: string | null;
  progress?: number;
  isComplete?: boolean;
  intent?: string;
  entities?: Record<string, any>;
  error?: string;
  timestamp: Date;
}

export interface OnboardingProgress {
  currentField: string;
  completedFields: string[];
  progress: number;
  totalFields: number;
  isComplete: boolean;
}

export interface PageContext {
  currentPage: string;
  availableSchemes?: Array<{
    id: string;
    title: string;
    selector: string;
    eligible?: boolean;
  }>;
  availableActions?: string[];
  formFields?: Array<{
    name: string;
    label: string;
    type: string;
    selector: string;
    required: boolean;
  }>;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type OnboardingField = 'name' | 'dob' | 'location' | 'income' | 'family_size' | 'occupation' | 'documents';
