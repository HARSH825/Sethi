// backend/controllers/userController.js (COMPLETE WORKING VERSION)
import prisma from '../config/database.js';
import { calculateAge, validateIndianMobile, cleanString, parseLocation, parseDocuments } from '../utils/helpers.js';

class UserController {
  /**
   * Create user profile after onboarding (FIXED WITH ARROW FUNCTIONS)
   */
  createUser = async (req, res) => {
    try {
      console.log('👤 Creating user profile:', req.body.name);

      const {
        name,
        dob,
        location,
        phone,
        email,
        income,
        family_size,
        occupation,
        documents,
        attributes
      } = req.body;

      // Validate required fields
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Name is required'
        });
      }

      // Calculate age safely
      const age = dob ? calculateAge(dob) : null;
      console.log('📊 Calculated age from DOB:', dob, '→', age);

      // Parse location safely
      const parsedLocation = parseLocation(location);
      console.log('📍 Parsed location:', parsedLocation);

      // Determine user attributes
      const userAttributes = {
        is_farmer: occupation ? occupation.toLowerCase().includes('farm') : false,
        is_senior: age ? age >= 60 : false,
        has_disability: false,
        income: income ? parseInt(income) : null,
        family_size: family_size ? parseInt(family_size) : null,
        occupation: occupation ? cleanString(occupation) : null,
        age: age,
        ...attributes
      };

      // Create user in database
      const user = await prisma.user.create({
        data: {
          name: cleanString(name),
          phone: phone ? cleanString(phone) : null,
          email: email ? cleanString(email) : null,
          dob: dob ? new Date(dob) : null,
          
          // Address as JSON
          address: {
            state: parsedLocation.state,
            district: parsedLocation.district,
            pincode: parsedLocation.pincode || null
          },
          
          // Attributes as JSON
          attributes: userAttributes
        }
      });

      console.log('✅ User created successfully with ID:', user.id);

      // Generate scheme recommendations - FIXED WITH DIRECT FUNCTION CALL
      try {
        console.log('🎯 Starting recommendation generation...');
        const recommendations = await this.generateRecommendationsForUser(user);
        console.log(`🎯 Generated ${recommendations.length} recommendations for user ${user.id}`);

        return res.status(201).json({
          success: true,
          message: 'User profile created successfully',
          user: {
            id: user.id,
            name: user.name,
            createdAt: user.createdAt
          },
          recommendations: recommendations
        });

      } catch (recommendationError) {
        console.error('⚠️ Recommendation generation failed:', recommendationError);
        
        // Return user without recommendations
        return res.status(201).json({
          success: true,
          message: 'User profile created successfully (recommendations will be generated)',
          user: {
            id: user.id,
            name: user.name,
            createdAt: user.createdAt
          },
          recommendations: []
        });
      }

    } catch (error) {
      console.error('❌ User creation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create user profile',
        error: error.message
      });
    }
  }

  /**
   * Generate scheme recommendations for user (ARROW FUNCTION)
   */
  generateRecommendationsForUser = async (user) => {
    try {
      console.log('🎯 Generating recommendations for user:', user.id);

      // Get all active schemes
      const schemes = await prisma.scheme.findMany({
        where: { isActive: true },
        orderBy: { priority: 'desc' }
      });

      if (schemes.length === 0) {
        console.log('⚠️ No active schemes found');
        return [];
      }

      console.log(`📋 Found ${schemes.length} active schemes to evaluate`);

      // Filter and score schemes based on user profile
      const recommendations = schemes
        .map(scheme => {
          const eligibilityCheck = this.checkUserEligibility(user, scheme);
          const relevanceScore = this.calculateSchemeRelevance(user, scheme);

          return {
            ...scheme,
            relevanceScore,
            eligibilityStatus: eligibilityCheck
          };
        })
        .filter(rec => rec.eligibilityStatus.eligible || rec.relevanceScore > 4)
        .sort((a, b) => {
          // Sort by eligibility first, then by relevance score
          if (a.eligibilityStatus.eligible && !b.eligibilityStatus.eligible) return -1;
          if (!a.eligibilityStatus.eligible && b.eligibilityStatus.eligible) return 1;
          return b.relevanceScore - a.relevanceScore;
        })
        .slice(0, 8); // Top 8 recommendations

      console.log(`📊 Filtered to ${recommendations.length} relevant recommendations`);
      return recommendations;

    } catch (error) {
      console.error('❌ Error generating recommendations:', error);
      return [];
    }
  }

  /**
   * Check eligibility for a specific scheme (ARROW FUNCTION)
   */
  checkUserEligibility = (user, scheme) => {
    const reasons = [];
    let eligible = true;
    let confidence = 0.8;

    const criteria = scheme.eligibilityCriteria || {};
    const userAttributes = user.attributes || {};
    const userAddress = user.address || {};

    // Check income requirements
    if (criteria.max_income && userAttributes.income) {
      const annualIncome = userAttributes.income * 12;
      if (annualIncome > criteria.max_income) {
        eligible = false;
        reasons.push(`Annual income ₹${annualIncome.toLocaleString()} exceeds limit of ₹${criteria.max_income.toLocaleString()}`);
      } else {
        reasons.push('Income requirement met');
      }
    } else if (criteria.max_income) {
      reasons.push('Income requirement needs verification');
      confidence = 0.6;
    }

    // Check age requirements
    if (criteria.min_age && userAttributes.age) {
      if (userAttributes.age < criteria.min_age) {
        eligible = false;
        reasons.push(`Age ${userAttributes.age} is below minimum ${criteria.min_age}`);
      } else {
        reasons.push('Age requirement met');
      }
    }

    if (criteria.max_age && userAttributes.age) {
      if (userAttributes.age > criteria.max_age) {
        eligible = false;
        reasons.push(`Age ${userAttributes.age} exceeds maximum ${criteria.max_age}`);
      }
    }

    // Check state requirements
    if (criteria.states && criteria.states.length > 0 && userAddress.state) {
      if (!criteria.states.includes(userAddress.state) && !criteria.states.includes('ALL_INDIA')) {
        eligible = false;
        reasons.push(`Not available in ${userAddress.state}`);
      } else {
        reasons.push('Location requirement met');
      }
    }

    // Special category checks
    if (criteria.is_farmer && !userAttributes.is_farmer) {
      eligible = false;
      reasons.push('Scheme is only for farmers');
    }

    if (eligible && reasons.length === 0) {
      reasons.push('All basic eligibility criteria appear to be met');
    }

    return {
      eligible,
      status: eligible ? 'ELIGIBLE' : 'NOT_ELIGIBLE',
      reasons,
      confidence
    };
  }

  /**
   * Calculate relevance score for scheme recommendation (ARROW FUNCTION)
   */
  calculateSchemeRelevance = (user, scheme) => {
    let score = 3; // Base score

    const tags = scheme.tags || [];
    const attributes = user.attributes || {};
    const userAddress = user.address || {};

    // Occupation-based scoring
    if (attributes.occupation) {
      const occupation = attributes.occupation.toLowerCase();
      if (occupation.includes('farm') && tags.includes('agriculture')) score += 4;
      if (occupation.includes('teacher') && tags.includes('education')) score += 3;
      if (occupation.includes('business') && tags.includes('business')) score += 3;
    }

    // Age-based scoring
    if (attributes.age) {
      if (attributes.age >= 60 && tags.includes('senior_citizen')) score += 4;
      if (attributes.age <= 25 && tags.includes('youth')) score += 2;
    }

    // Income-based scoring
    if (attributes.income) {
      if (attributes.income < 25000) score += 3; // Lower income gets higher priority
      if (attributes.income < 50000 && tags.includes('low_income')) score += 2;
    }

    // Family size considerations
    if (attributes.family_size && attributes.family_size > 4 && tags.includes('family')) score += 2;

    // State preference
    if (userAddress.state === scheme.state || scheme.state === 'ALL_INDIA') score += 1;

    // Benefit amount consideration
    if (scheme.benefitAmount > 100000) score += 1;
    if (scheme.benefitAmount > 500000) score += 2;

    return Math.min(score, 10); // Cap at 10
  }

  /**
   * Get user profile by ID (ARROW FUNCTION)
   */
  getUserProfile = async (req, res) => {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          applications: {
            include: {
              scheme: {
                select: {
                  id: true,
                  title: true,
                  benefitAmount: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        user,
        applicationCount: user.applications.length,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('❌ Get user error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user profile',
        error: error.message
      });
    }
  }

  /**
   * Get scheme recommendations for user (ARROW FUNCTION)
   */
  getRecommendations = async (req, res) => {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const recommendations = await this.generateRecommendationsForUser(user);

      res.json({
        success: true,
        recommendations,
        count: recommendations.length,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('❌ Get recommendations error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to get recommendations',
        error: error.message
      });
    }
  }
}

export default new UserController();
