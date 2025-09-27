// config/database.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error'] 
    : ['error']
});

export const testConnection = async () => {
  try {
    await prisma.$connect();
    console.log('📊 Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

export const disconnect = async () => {
  await prisma.$disconnect();
};

export default prisma;
