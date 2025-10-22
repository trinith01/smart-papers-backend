import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';


import dotenv from 'dotenv';
//import studentRoutes from './routes/studentRoutes.js';
//import studentRouter from './routes/studentRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import paperRouter from './routes/paperRoutes.js';
import submissionRouter from './routes/submissionRoutes.js';
import instituteRouter from './routes/instituteRoutes.js';
import teacherRouter from './routes/teacherRouter.js';
import setUserRoleRouter from './routes/setUserRole.js';
import analysisRouter from './routes/analysisRouter.js';
import llmRouter from './routes/llmRoutes.js';
import imageRouter from './routes/imageRoutes.js';
import videoRouter from './routes/videoRoutes.js';
import questionBankRouter from './routes/questioBankRoutes.js';
import techerUnitRouter from './routes/teacherUnitRoutes.js';
import paperStatRouter from './routes/paperStatRoutes.js';
import schedulerRouter from './routes/schedulerRoutes.js';
import paperScheduler from './services/paperScheduler.js';
import './models/index.js';



dotenv.config();

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(cors()); 

app.use('/api/students', studentRoutes);
app.use('/api/papers', paperRouter);
app.use('/api/submissions', submissionRouter);
app.use('/api/institutes', instituteRouter);
app.use('/api/teachers', teacherRouter);
app.use('/api/setUserRole', setUserRoleRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/llm', llmRouter);
app.use('/api/videos', videoRouter);
app.use('/api/questionBank', questionBankRouter);
app.use('/api/teacherUnits', techerUnitRouter);
app.use('/api/paperStats', paperStatRouter);
app.use('/api/scheduler', schedulerRouter);
app.use(imageRouter);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    
    // Initialize the paper scheduler after database connection
    paperScheduler.init();
    
    app.listen(5000, () => {
      console.log(`🚀 Server running on port 5000`);
      console.log('📅 Paper Scheduler is running and checking for papers to schedule');
    });
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Graceful shutdown handling
const gracefulShutdown = () => {
  console.log('🛑 Received shutdown signal, cleaning up...');
  
  // Stop the scheduler
  paperScheduler.stop();
  
  // Close database connection
  mongoose.connection.close(() => {
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  });
};

// Handle various shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('SIGUSR1', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown);
