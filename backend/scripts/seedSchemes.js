// backend/scripts/seedSchemes.js (ENHANCED WITH BETTER ERROR HANDLING)
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

const sampleSchemes = [
  {
    id: 'pmay-2024',
    title: 'Pradhan Mantri Awas Yojana (PMAY)',
    description: 'Affordable housing scheme for economically weaker sections and low-income groups to provide pucca houses with basic amenities.',
    agency: 'Ministry of Housing and Urban Affairs',
    state: 'ALL_INDIA',
    benefitAmount: 250000,
    eligibilityCriteria: {
      max_income: 1800000,
      min_age: 18,
      max_age: 70,
      states: ['ALL_INDIA']
    },
    requiredDocuments: [
      'Aadhaar Card',
      'Income Certificate', 
      'Bank Account Details',
      'Property Documents'
    ],
    applicationUrl: 'https://pmaymis.gov.in/',
    tags: ['housing', 'urban', 'subsidy', 'PMAY'],
    priority: 95,
    isActive: true
  },
  {
    id: 'pm-kisan-2024', 
    title: 'PM Kisan Samman Nidhi Yojana',
    description: 'Financial assistance of Rs 6000 per year in three equal installments to small and marginal farmers.',
    agency: 'Ministry of Agriculture and Farmers Welfare',
    state: 'ALL_INDIA',
    benefitAmount: 6000,
    eligibilityCriteria: {
      min_age: 18,
      states: ['ALL_INDIA'],
      is_farmer: true
    },
    requiredDocuments: [
      'Aadhaar Card',
      'Land Records', 
      'Bank Account Details',
      'Passport Size Photo'
    ],
    applicationUrl: 'https://pmkisan.gov.in/',
    tags: ['agriculture', 'farmer', 'PMKISAN'],
    priority: 90,
    isActive: true
  },
  {
    id: 'ayushman-bharat-2024',
    title: 'Ayushman Bharat Pradhan Mantri Jan Arogya Yojana',
    description: 'Health insurance scheme providing coverage up to Rs 5 lakh per family per year.',
    agency: 'Ministry of Health and Family Welfare', 
    state: 'ALL_INDIA',
    benefitAmount: 500000,
    eligibilityCriteria: {
      max_income: 1000000,
      states: ['ALL_INDIA']
    },
    requiredDocuments: [
      'Aadhaar Card',
      'Ration Card', 
      'Income Certificate',
      'Family Photo'
    ],
    applicationUrl: 'https://bis.pmjay.gov.in/',
    tags: ['health', 'insurance', 'AYUSHMAN'],
    priority: 88,
    isActive: true
  }
];

async function seedSchemes() {
  try {
    console.log('🌱 Starting scheme seeding...');
    console.log('📍 Current directory:', process.cwd());
    
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Clear existing schemes
    const deleteResult = await prisma.scheme.deleteMany();
    console.log(`🗑️ Cleared ${deleteResult.count} existing schemes`);
    
    let createdCount = 0;
    
    for (const schemeData of sampleSchemes) {
      try {
        console.log(`✨ Creating scheme: ${schemeData.title}`);
        
        const created = await prisma.scheme.create({
          data: schemeData
        });
        
        console.log(`   ✓ Created with ID: ${created.id}`);
        createdCount++;
        
      } catch (schemeError) {
        console.error(`   ❌ Failed to create ${schemeData.title}:`, schemeError.message);
      }
    }
    
    console.log(`\n🎉 Seeding completed successfully!`);
    console.log(`📊 Total schemes created: ${createdCount}`);
    
    // Verify data
    const allSchemes = await prisma.scheme.findMany({
      select: { 
        id: true, 
        title: true, 
        isActive: true, 
        benefitAmount: true 
      }
    });
    
    console.log(`\n📋 Verified ${allSchemes.length} schemes in database:`);
    allSchemes.forEach((scheme, index) => {
      console.log(`   ${index + 1}. ${scheme.id}: ${scheme.title} (₹${scheme.benefitAmount.toLocaleString()})`);
    });
    
    console.log('\n✅ All done! Database is ready.');
    
  } catch (error) {
    console.error('❌ Seeding process failed:', error);
    
    if (error.code) {
      console.error('📍 Error code:', error.code);
    }
    
    if (error.message) {
      console.error('📍 Error message:', error.message);
    }
    
    if (error.meta) {
      console.error('📍 Error details:', JSON.stringify(error.meta, null, 2));
    }
    
    console.error('\n💡 Troubleshooting tips:');
    console.error('   1. Make sure PostgreSQL database is running');
    console.error('   2. Check DATABASE_URL in .env file'); 
    console.error('   3. Run: npx prisma migrate dev');
    console.error('   4. Run: npx prisma generate');
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Database connection closed');
  }
}

// Run the seeding
seedSchemes();
