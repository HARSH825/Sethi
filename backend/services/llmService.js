// backend/services/llmService.js (ORIGINAL VERSION WITH ORIGINAL PROMPTS)
import { GoogleGenerativeAI } from '@google/generative-ai';

class LLMService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      }
    });
    
    console.log('🧠 Gemini LLM service initialized - Phase 1 Complete with Bug Fixes');
  }

  async extractOnboardingData(transcript, currentField) {
    try {
      const prompt = `Extract ${currentField} from user's response: "${transcript}"

Current field: ${currentField}
User response: "${transcript}"

Extract and return JSON:
{
  "value": "extracted_value",
  "confidence": 0.9,
  "needsConfirmation": false
}

Field-specific guidelines:
- name: Extract full name, handle Indian names, Sanskrit names, Hindi names
- dob: Convert to YYYY-MM-DD format (e.g., "15th June 1985" → "1985-06-15")
- location: Extract state and district if mentioned, format as "State, District"
- income: Extract numeric value in rupees (monthly), remove commas and words
- family_size: Extract number of family members (just the number)
- occupation: Standardize occupation names (farmer, engineer, teacher, business, student, etc.)
- documents: Extract yes/no for document possession, return "yes" or list of documents

Examples:
- "My name is राज कुमार" → {"value": "राज कुमार", "confidence": 0.95}
- "I was born on 15th June 1985" → {"value": "1985-06-15", "confidence": 0.9}
- "I live in Delhi, Dwarka" → {"value": "Delhi, Dwarka", "confidence": 0.9}
- "My income is 45 thousand per month" → {"value": "45000", "confidence": 0.9}
- "We are 4 people in family" → {"value": "4", "confidence": 0.9}

If unclear, set needsConfirmation: true`;

      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { success: true, ...parsed };
      }
      
      return {
        success: true,
        value: responseText.trim(),
        confidence: 0.7,
        needsConfirmation: true
      };

    } catch (error) {
      console.error('❌ Data extraction error:', error);
      return {
        success: false,
        error: 'Could not understand the response. Please try again.',
        value: '',
        confidence: 0
      };
    }
  }

  async generateOnboardingResponse(extractedData, nextField) {
    try {
      const prompt = `You are Saarthi, a helpful government scheme assistant.

User provided: ${extractedData.value} for field: ${extractedData.field || 'unknown'}
Next field to ask: ${nextField || 'complete'}
Confidence: ${extractedData.confidence}

Generate a warm, conversational response that:
1. Confirms what you understood: "Great! I got [value]"
2. ${nextField ? `Asks for the next field: ${nextField}` : 'Says profile is complete and mentions finding schemes'}

Keep under 60 words, friendly and encouraging. Use simple language.

Field prompts:
- name → dob: "Perfect! Now, when were you born? You can say like '15th June 1985' or just 'June 1985'"
- dob → location: "Got it! Which state and city do you live in?"
- location → income: "Thanks! What's your monthly income in rupees?"
- income → family_size: "Understood! How many people are there in your family including yourself?"
- family_size → occupation: "Great! What kind of work do you do?"
- occupation → documents: "Perfect! Do you have Aadhaar card, PAN card, and bank account?"
- documents → complete: "Excellent! Your profile is complete. Let me find government schemes for you!"`;

      const result = await this.model.generateContent(prompt);
      return {
        success: true,
        response: result.response.text().trim()
      };

    } catch (error) {
      const fallbackResponses = {
        name: "Great! Now, when were you born?",
        dob: "Perfect! Which state do you live in?",
        location: "Got it! What's your monthly income?",
        income: "Thanks! How many family members?",
        family_size: "Great! What work do you do?",
        occupation: "Perfect! Do you have Aadhaar and PAN?",
        documents: "Excellent! Finding schemes for you now!"
      };

      return {
        success: false,
        response: fallbackResponses[extractedData.field] || "Let's continue with the next question."
      };
    }
  }

  async processNavigationCommand(transcript, pageContext, userProfile) {
    try {
      const prompt = `You are Saarthi helping user navigate government schemes.

User said: "${transcript}"
Current page: ${pageContext.currentPage || 'unknown'}
User profile: ${JSON.stringify(userProfile)}

Map the user request to a scheme and provide response in JSON:
{
  "intent": "navigate|explain|check_eligibility|apply|show_scheme",
  "target_scheme": "exact_scheme_id",
  "action": "show_scheme|explain_benefits|check_eligibility|start_application",
  "response": "natural_language_response_max_80_words"
}

SCHEME MAPPING (use exact IDs):
- "प्रधानमंत्री आवास योजना" | "PM Awas" | "PMAY" | "housing" | "आवास" → target_scheme: "pmay-2024"
- "PM Kisan" | "किसान" | "farmer scheme" | "6000" | "kisan samman" → target_scheme: "pm-kisan-2024"  
- "Ayushman Bharat" | "health insurance" | "5 lakh" | "आयुष्मान" → target_scheme: "ayushman-bharat-2024"
- "Mudra" | "business loan" | "10 lakh loan" | "मुद्रा" → target_scheme: "mudra-yojana-2024"

Examples:
- "टेल मी अबाउट प्रधानमंत्री आवास योजना" → {"intent": "explain", "target_scheme": "pmay-2024", "action": "show_scheme"}
- "Show me PM Kisan" → {"intent": "navigate", "target_scheme": "pm-kisan-2024", "action": "show_scheme"}`;

      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return {
          success: true,
          ...JSON.parse(jsonMatch[0])
        };
      }

      return {
        success: true,
        intent: 'general',
        response: responseText.trim()
      };

    } catch (error) {
      console.error('❌ Navigation processing error:', error);
      return {
        success: false,
        intent: 'error',
        response: "I didn't catch that. Could you please repeat?"
      };
    }
  }

  async processSchemeNavigation(transcript, schemeData, userProfile) {
    try {
      const safeUserProfile = userProfile || {
        name: 'User',
        attributes: {
          income: null,
          age: null,
          occupation: null
        },
        address: {
          state: null
        }
      };

      const safeSchemeData = schemeData || {
        title: 'Government Scheme',
        benefitAmount: 0,
        requiredDocuments: []
      };

      console.log('🎯 Processing scheme navigation:', {
        transcript: transcript?.substring(0, 50),
        schemeTitle: safeSchemeData.title,
        userName: safeUserProfile.name
      });

      const prompt = `You are Saarthi helping user with a specific government scheme.

User asked: "${transcript}"

SCHEME DETAILS:
- Name: ${safeSchemeData.title}
- Benefit: ₹${safeSchemeData.benefitAmount?.toLocaleString() || '0'}
- Documents needed: ${safeSchemeData.requiredDocuments?.join(', ') || 'Standard documents'}
- Agency: ${safeSchemeData.agency || 'Government of India'}

USER PROFILE:
- Name: ${safeUserProfile.name || 'User'}
- Income: ₹${safeUserProfile.attributes?.income || 'Not provided'}
- Age: ${safeUserProfile.attributes?.age || 'Not provided'}
- State: ${safeUserProfile.address?.state || 'Not provided'}
- Occupation: ${safeUserProfile.attributes?.occupation || 'Not provided'}

Provide helpful response in JSON:
{
  "intent": "explain_eligibility|explain_benefits|explain_documents|explain_application|general_info",
  "action": "explain|provide_info",
  "response": "detailed_helpful_response_max_120_words",
  "specific_info": "relevant_scheme_details"
}

Response guidelines:
- "How do I apply?" → Explain application process step by step
- "What documents?" → List the specific required documents
- "Am I eligible?" → Check user profile against scheme criteria
- "How much money?" → Explain benefit amount, frequency, disbursement
- "Tell me more" → Give comprehensive scheme overview
- Be specific, reference scheme details, personalize for the user`;

      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('✅ Scheme navigation response generated:', parsed.intent);
        return {
          success: true,
          ...parsed
        };
      }

      const fallbackResponse = this.generateFallbackSchemeResponse(transcript, safeSchemeData);
      return {
        success: true,
        intent: 'general_info',
        action: 'provide_info',
        response: fallbackResponse,
        specific_info: safeSchemeData.title
      };

    } catch (error) {
      console.error('❌ Scheme navigation processing error:', error);
      return {
        success: false,
        intent: 'error',
        action: 'none',
        response: "I'm having trouble understanding your question about this scheme. Could you please ask again in a different way?"
      };
    }
  }

  generateFallbackSchemeResponse(transcript, schemeData) {
    const lowerTranscript = transcript.toLowerCase();
    
    if (lowerTranscript.includes('apply') || lowerTranscript.includes('how')) {
      return `To apply for ${schemeData.title}, you'll need to visit the official government portal. The typical process involves filling an online form with your personal details and uploading required documents. The benefit amount is ₹${schemeData.benefitAmount?.toLocaleString() || '0'}.`;
    }
    
    if (lowerTranscript.includes('document') || lowerTranscript.includes('need')) {
      const docs = schemeData.requiredDocuments?.join(', ') || 'Aadhaar card, PAN card, bank account details';
      return `For ${schemeData.title}, you typically need these documents: ${docs}. Make sure all documents are valid and up-to-date before applying.`;
    }
    
    if (lowerTranscript.includes('money') || lowerTranscript.includes('benefit') || lowerTranscript.includes('amount')) {
      return `${schemeData.title} provides a benefit of ₹${schemeData.benefitAmount?.toLocaleString() || '0'}. This amount is typically disbursed directly to your bank account after successful application verification.`;
    }
    
    if (lowerTranscript.includes('eligible') || lowerTranscript.includes('qualify')) {
      return `To check eligibility for ${schemeData.title}, your income, age, and location are key factors. Based on the scheme criteria and your profile, I can help determine if you qualify. The benefit is ₹${schemeData.benefitAmount?.toLocaleString() || '0'}.`;
    }
    
    return `${schemeData.title} is a government scheme offering benefits of ₹${schemeData.benefitAmount?.toLocaleString() || '0'}. You can apply through the official portal by submitting the required documents and personal information.`;
  }

  async explainScheme(scheme, userProfile) {
    try {
      const prompt = `Explain this government scheme to the user in simple terms:

Scheme: ${JSON.stringify(scheme)}
User Profile: ${JSON.stringify(userProfile)}

Provide a personalized explanation covering:
1. What the scheme offers (2 sentences)
2. Why it's relevant for this user (1-2 sentences)  
3. Benefit amount and frequency
4. Simple eligibility assessment

Keep conversational, under 100 words, use simple language.`;

      const result = await this.model.generateContent(prompt);
      
      return {
        success: true,
        explanation: result.response.text().trim()
      };

    } catch (error) {
      console.error('❌ Scheme explanation error:', error);
      return {
        success: false,
        explanation: `${scheme.title} provides benefits of ₹${scheme.benefitAmount} annually. Based on your profile, you may be eligible. Please check the detailed eligibility criteria to confirm.`
      };
    }
  }
}

export default new LLMService();
