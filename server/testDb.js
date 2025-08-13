require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    await prisma.$connect();
    console.log("Connected to database successfully!");
  } catch (err) {
    console.error("Database connection error:", err);
  }
}

testConnection();
