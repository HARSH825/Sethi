// utils/seedData.js
import prisma from '../config/database.js';

const sampleSchemes = [
  {
    title: "PM Kisan Samman Nidhi",
    description: "Direct income support of ₹6,000 per year to small and marginal farmers families",
    agency: "Ministry of Agriculture",
    eligibilityCriteria: {
      max_income: 200000,
      states: ["ALL_INDIA"],
      required_documents: ["aadhaar", "bank_account", "land_records"],
      is_farmer: true
    },
    requiredDocuments: ["Aadhaar Card", "Bank Account Details", "Land Records"],
    applicationUrl: "https://pmkisan.gov.in/",
    tags: ["agriculture", "direct_benefit", "income_support"],
    state: "ALL_INDIA",
    benefitAmount: 6000,
    priority: 5
  },
  {
    title: "Ayushman Bharat PM-JAY",
    description: "Health insurance coverage of ₹5 lakh per family per year for hospitalization",
    agency: "National Health Authority",
    eligibilityCriteria: {
      max_income: 180000,
      states: ["ALL_INDIA"],
      required_documents: ["aadhaar", "ration_card"],
      family_based: true
    },
    requiredDocuments: ["Aadhaar Card", "Ration Card", "Income Certificate"],
    applicationUrl: "https://pmjay.gov.in/",
    tags: ["healthcare", "insurance", "family_coverage"],
    state: "ALL_INDIA", 
    benefitAmount: 500000,
    priority: 5
  },
  {
    title: "Pradhan Mantri Awas Yojana",
    description: "Housing subsidy for construction/purchase of houses for economically weaker sections",
    agency: "Ministry of Housing and Urban Affairs",
    eligibilityCriteria: {
      max_income: 600000,
      states: ["ALL_INDIA"],
      required_documents: ["aadhaar", "income_certificate", "property_documents"],
      first_time_buyer: true
    },
    requiredDocuments: ["Aadhaar Card", "Income Certificate", "Property Documents", "Bank Account"],
    applicationUrl: "https://pmaymis.gov.in/",
    tags: ["housing", "subsidy", "urban_development"],
    state: "ALL_INDIA",
    benefitAmount: 250000,
    priority: 4
  },
  {
    title: "National Social Assistance Programme - Old Age Pension",
    description: "Monthly pension of ₹200 for elderly persons from Below Poverty Line families",
    agency: "Ministry of Rural Development", 
    eligibilityCriteria: {
      min_age: 60,
      max_income: 50000,
      states: ["ALL_INDIA"],
      required_documents: ["aadhaar", "age_proof", "income_certificate"]
    },
    requiredDocuments: ["Aadhaar Card", "Age Proof", "Income Certificate", "Bank Account"],
    applicationUrl: "https://nsap.nic.in/",
    tags: ["senior_citizen", "pension", "monthly_benefit"],
    state: "ALL_INDIA",
    benefitAmount: 2400, // Annual
    priority: 4
  },
  {
    title: "Mudra Loan Scheme",
    description: "Collateral-free loans up to ₹10 lakh for micro and small enterprises",
    agency: "Ministry of Finance",
    eligibilityCriteria: {
      max_income: 1000000,
      states: ["ALL_INDIA"],
      required_documents: ["aadhaar", "pan", "business_proof"],
      business_owner: true
    },
    requiredDocuments: ["Aadhaar Card", "PAN Card", "Business Proof", "Bank Account"],
    applicationUrl: "https://mudra.org.in/",
    tags: ["business", "loan", "entrepreneurship"],
    state: "ALL_INDIA",
    benefitAmount: 1000000, // Maximum loan
    priority: 3
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Seeding database with sample schemes...');
    
    // Clear existing schemes
    await prisma.application.deleteMany();
    await prisma.scheme.deleteMany();
    await prisma.user.deleteMany();
    
    // Insert sample schemes
    for (const scheme of sampleSchemes) {
      await prisma.scheme.create({ data: scheme });
      console.log(`✅ Created scheme: ${scheme.title}`);
    }
    
    console.log('🎉 Database seeded successfully!');
    console.log(`📊 Created ${sampleSchemes.length} sample schemes`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeder
seedDatabase();
