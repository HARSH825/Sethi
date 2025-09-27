// backend/services/llmService.js (COMPLETE UPDATED FILE)
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
    
    console.log('🧠 Gemini LLM service initialized - Phase 1 Complete with Validation Fixes');
  }

  async extractOnboardingData(transcript, currentField) {
    try {
      const prompt = `Extract ${currentField} from user's response: "${transcript}"

Current field: ${currentField}
User response: "${transcript}"

STRICT VALIDATION RULES:
- Only return success: true if you can confidently extract the required information
- Set confidence to 0.1-0.4 for unclear/ambiguous responses
- Set confidence to 0.5-0.7 for partially clear responses  
- Set confidence to 0.8-1.0 for very clear responses
- Set needsConfirmation: true if confidence < 0.8 or if ambiguous

Extract and return JSON:
{
  "success": true_or_false,
  "value": "extracted_value_or_null",
  "confidence": 0.0_to_1.0,
  "needsConfirmation": true_or_false
}

Field-specific validation:
- name: Must be a clear full name (not just "yes", "no", unclear sounds)
- dob: Must be convertible to YYYY-MM-DD format (e.g., "15th June 1985" → "1985-06-15")
- location: Must include state/city (not just "here", "there", unclear location)
- income: Must be a clear number in rupees (monthly), reject vague amounts
- family_size: Must be a clear number (1-20 range), not "many", "few"
- occupation: Must be a clear job/work description (not "work", "job")
- documents: Must clearly indicate yes/no or list specific documents

REJECT these unclear responses:
- Unclear sounds: "hmm", "uh", "yeah", mumbling
- Non-answers: "I don't know", "maybe", "sort of"
- Too vague: "some", "many", "around", "about"
- Wrong context: answering different question

Examples of FAILED extraction (confidence < 0.5):
- name: "uh, yeah" → {"success": false, "value": null, "confidence": 0.2}
- income: "some money" → {"success": false, "value": null, "confidence": 0.3}
- location: "here" → {"success": false, "value": null, "confidence": 0.1}

Examples of SUCCESSFUL extraction (confidence > 0.7):
- name: "My name is राज कुमार" → {"success": true, "value": "राज कुमार", "confidence": 0.95}
- income: "45 thousand per month" → {"success": true, "value": "45000", "confidence": 0.9}
- location: "Delhi, Dwarka" → {"success": true, "value": "Delhi, Dwarka", "confidence": 0.9}`;

      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Additional validation layer
        if (parsed.success && (!parsed.value || parsed.value.toString().trim().length < 2)) {
          parsed.success = false;
          parsed.confidence = 0.1;
          parsed.needsConfirmation = true;
        }
        
        // Ensure confidence is reasonable
        if (parsed.confidence > 0.95) parsed.confidence = 0.9;
        if (parsed.confidence < 0.1) parsed.confidence = 0.1;
        
        console.log(`🔍 Extraction result for ${currentField}:`, parsed);
        return { success: true, ...parsed };
      }
      
      // Fallback for unclear responses
      return {
        success: false,
        value: null,
        confidence: 0.2,
        needsConfirmation: true
      };

    } catch (error) {
      console.error('❌ Data extraction error:', error);
      return {
        success: false,
        error: 'Could not understand the response. Please try again.',
        value: null,
        confidence: 0.1,
        needsConfirmation: true
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
1. Confirms what you understood: "Great! I got [value]" or "Perfect!"
2. ${nextField ? `Asks for the next field: ${nextField}` : 'Says profile is complete and mentions finding schemes'}

Keep under 60 words, friendly and encouraging. Use simple language.

Field prompts for next questions:
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

  /**
   * NEW: Generate retry response for failed extractions
   */
  async generateRetryResponse(currentField, transcript) {
    try {
      const prompt = `User tried to provide ${currentField} but said: "${transcript}"

This was unclear or didn't contain the needed information.

Generate a helpful retry message that:
1. Acknowledges what they said politely
2. Asks them to try again more clearly
3. Gives a specific example for ${currentField}

Field-specific examples:
- name: "I didn't catch your name clearly. Could you please say your full name again? For example, 'My name is Raj Kumar'"
- dob: "I couldn't understand your date of birth. Please try again like 'I was born on 15th June 1985'"
- location: "I didn't get your location clearly. Please say your state and city like 'I live in Delhi, Dwarka'"
- income: "I didn't get your income clearly. Please say it like 'My monthly income is 45 thousand rupees'"
- family_size: "How many people are in your family? Please say the number clearly like 'We are 4 people'"
- occupation: "What work do you do? Please tell me clearly like 'I am a farmer' or 'I work in software'"
- documents: "Do you have Aadhaar card, PAN card, and bank account? Please say 'yes I have all' or 'no'"

Keep under 50 words, be encouraging and specific.`;

      const result = await this.model.generateContent(prompt);
      return {
        success: true,
        response: result.response.text().trim()
      };

    } catch (error) {
      const fallbacks = {
        name: "I didn't catch your name clearly. Could you please say your full name again? For example, 'My name is Raj Kumar'",
        dob: "I couldn't understand your date of birth. Please try again like 'I was born on 15th June 1985'",
        location: "I didn't get your location. Could you say your state and city again like 'I live in Delhi'?",
        income: "I didn't understand your income. Please say your monthly income clearly like '45 thousand rupees'",
        family_size: "How many people are in your family? Please say the number clearly like 'We are 4 people'",
        occupation: "What work do you do? Please tell me your occupation clearly like 'I am a farmer'",
        documents: "Do you have Aadhaar card, PAN card, and bank account? Please say 'yes' or 'no'"
      };

      return {
        success: false,
        response: fallbacks[currentField] || "I didn't understand that clearly. Could you please try again?"
      };
    }
  }

  /**
   * NEW: Generate confirmation request for low confidence extractions
   */
  async generateConfirmationRequest(currentField, extractedValue, confidence) {
    try {
      const prompt = `User provided ${currentField} and I extracted: "${extractedValue}" with confidence ${confidence}

Generate a confirmation message that:
1. Repeats what I understood
2. Asks for confirmation
3. Gives option to correct

Examples:
- "I understood your name as '${extractedValue}'. Is that correct? Say yes to continue or tell me your correct name."
- "Did I get your income right as ₹${extractedValue}? Say yes or correct me."
- "So you live in ${extractedValue}? Please confirm or tell me the correct location."

Keep under 35 words, be polite and clear.`;

      const result = await this.model.generateContent(prompt);
      return {
        success: true,
        response: result.response.text().trim()
      };

    } catch (error) {
      const fallbacks = {
        name: `I understood your name as "${extractedValue}". Is that correct? Say yes to continue or tell me your correct name.`,
        dob: `Did I get your date of birth right as ${extractedValue}? Say yes or correct me.`,
        location: `So you live in ${extractedValue}? Please confirm or tell me the correct location.`,
        income: `I understood your monthly income as ₹${extractedValue}. Is that right? Say yes or correct me.`,
        family_size: `You have ${extractedValue} people in your family? Please confirm or correct me.`,
        occupation: `Your work is ${extractedValue}? Say yes if correct or tell me your actual occupation.`,
        documents: `You said ${extractedValue} about documents. Is that right? Please confirm.`
      };

      return {
        success: false,
        response: fallbacks[currentField] || `I understood ${currentField} as "${extractedValue}". Is that correct? Say yes to continue or correct me.`
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

  /**
   * Process scheme-specific navigation with proper error handling
   */
  async processSchemeNavigation(transcript, schemeData, userProfile) {
    try {
      // Handle null/undefined userProfile gracefully
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

      // Fallback response
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

  /**
   * Generate fallback response for scheme questions
   */
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
