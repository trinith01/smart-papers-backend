import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { startWorker } from './services/submissionWorker.js';
import queueService from './services/queueService.js';
import './models/index.js';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'MONGO_URI',
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'SQS_QUEUE_URL',
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

console.log('🔧 Starting Submission Worker...');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    
    // Validate SQS configuration
    queueService.validateConfig();
    
    // Start the worker
    startWorker().catch(err => {
      console.error('❌ Worker error:', err);
      process.exit(1);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Graceful shutdown handling
const gracefulShutdown = () => {
  console.log('🛑 Received shutdown signal, cleaning up...');
  
  mongoose.connection.close(() => {
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
