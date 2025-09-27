// backend/controllers/schemeController.js (COMPLETE NEW FILE)
import prisma from '../config/database.js';

class SchemeController {
  /**
   * Get all schemes with filters
   */
  async getSchemes(req, res) {
    try {
      const { 
        state, 
        category, 
        minIncome, 
        maxIncome, 
        minAge, 
        maxAge,
        limit = 20, 
        offset = 0 
      } = req.query;

      console.log('📋 Fetching schemes with filters:', req.query);

      const where = {
        isActive: true
      };

      // Add filters
      if (state && state !== 'ALL_INDIA') {
        where.OR = [
          { state: state },
          { state: 'ALL_INDIA' }
        ];
      }

      if (category) {
        where.tags = {
          has: category
        };
      }

      const schemes = await prisma.scheme.findMany({
        where,
        orderBy: { priority: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      });

      const total = await prisma.scheme.count({ where });

      console.log(`📊 Found ${schemes.length} schemes out of ${total} total`);

      res.json({
        success: true,
        schemes,
        count: schemes.length,
        total,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('❌ Get schemes error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch schemes',
        error: error.message
      });
    }
  }

  /**
   * Get single scheme by ID with personalized eligibility check
   */
  async getScheme(req, res) {
    try {
      const { id } = req.params;
      const { userId } = req.query;

      console.log('📄 Fetching scheme:', id, 'for user:', userId);

      // First try to find scheme by ID
      let scheme = await prisma.scheme.findUnique({
        where: { id }
      });

      // If not found by UUID, try by title or common abbreviation
      if (!scheme) {
        const searchTerm = id.toUpperCase();
        
        scheme = await prisma.scheme.findFirst({
          where: {
            OR: [
              { title: { contains: searchTerm, mode: 'insensitive' } },
              { tags: { has: searchTerm } },
              // Common scheme abbreviations
              ...(searchTerm === 'PMAY' ? [{ title: { contains: 'Pradhan Mantri Awas Yojana', mode: 'insensitive' } }] : []),
              ...(searchTerm === 'PMKISAN' ? [{ title: { contains: 'PM Kisan', mode: 'insensitive' } }] : []),
              ...(searchTerm === 'AYUSHMAN' ? [{ title: { contains: 'Ayushman Bharat', mode: 'insensitive' } }] : []),
              ...(searchTerm === 'MUDRA' ? [{ title: { contains: 'Mudra Yojana', mode: 'insensitive' } }] : [])
            ],
            isActive: true
          }
        });
      }

      if (!scheme) {
        console.log('❌ Scheme not found:', id);
        return res.status(404).json({
          success: false,
          message: 'Scheme not found'
        });
      }

      console.log('✅ Scheme found:', scheme.title);

      let eligibilityCheck = null;
      let personalizedExplanation = '';

      // If user ID provided, do eligibility check
      if (userId) {
        try {
          const user = await prisma.user.findUnique({
            where: { id: userId }
          });

          if (user) {
            eligibilityCheck = this.checkEligibility(user, scheme);
            personalizedExplanation = this.generatePersonalizedExplanation(user, scheme);
          }
        } catch (userError) {
          console.warn('⚠️ User lookup failed:', userError.message);
        }
      }

      res.json({
        success: true,
        scheme,
        eligibilityCheck,
        personalizedExplanation,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('❌ Get scheme error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch scheme details',
        error: error.message
      });
    }
  }

  /**
   * Check user eligibility for scheme
   */
  checkEligibility(user, scheme) {
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
   * Generate personalized explanation
   */
  generatePersonalizedExplanation(user, scheme) {
    const userAttributes = user.attributes || {};
    const userAddress = user.address || {};
    
    let explanation = `${scheme.title} offers benefits of ₹${scheme.benefitAmount.toLocaleString()} annually. `;
    
    if (userAttributes.income) {
      const annualIncome = userAttributes.income * 12;
      if (scheme.eligibilityCriteria?.max_income && annualIncome <= scheme.eligibilityCriteria.max_income) {
        explanation += `With your annual income of ₹${annualIncome.toLocaleString()}, you meet the income criteria. `;
      }
    }
    
    if (userAddress.state && (scheme.state === userAddress.state || scheme.state === 'ALL_INDIA')) {
      explanation += `This scheme is available in ${userAddress.state}. `;
    }
    
    if (userAttributes.occupation && scheme.tags?.includes('agriculture') && userAttributes.occupation.toLowerCase().includes('farm')) {
      explanation += `As a farmer, this scheme is particularly relevant for you. `;
    }
    
    explanation += `You can apply through the official government portal with the required documents.`;
    
    return explanation;
  }

  /**
   * Get scheme categories
   */
  async getCategories(req, res) {
    try {
      const schemes = await prisma.scheme.findMany({
        where: { isActive: true },
        select: { tags: true }
      });

      const allTags = schemes.flatMap(scheme => scheme.tags || []);
      const categories = [...new Set(allTags)].sort();

      res.json({
        success: true,
        categories,
        count: categories.length
      });

    } catch (error) {
      console.error('❌ Get categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch categories',
        error: error.message
      });
    }
  }

  /**
   * Search schemes by title or description
   */
  async searchSchemes(req, res) {
    try {
      const { q, limit = 10 } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Search query required'
        });
      }

      console.log('🔍 Searching schemes for:', q);

      const schemes = await prisma.scheme.findMany({
        where: {
          AND: [
            { isActive: true },
            {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
                { tags: { has: q.toUpperCase() } }
              ]
            }
          ]
        },
        orderBy: { priority: 'desc' },
        take: parseInt(limit)
      });

      console.log(`🔍 Found ${schemes.length} schemes matching "${q}"`);

      res.json({
        success: true,
        schemes,
        count: schemes.length,
        query: q
      });

    } catch (error) {
      console.error('❌ Search schemes error:', error);
      res.status(500).json({
        success: false,
        message: 'Search failed',
        error: error.message
      });
    }
  }
}

export default new SchemeController();
