import Submission from '../models/Submisstion.js';
import Paper from '../models/Paper.js';
import SubmissionJob from '../models/SubmissionJob.js';
import queueService from './queueService.js';

/**
 * Process a single submission from the queue
 * This contains the core submission logic extracted from the controller
 */
export async function processSubmission(messageBody) {
  const { jobId, studentId, paperId, answers, instituteId } = messageBody;
  
  console.log(`🔄 Processing submission jobId: ${jobId}`);

  try {
    // Update job status to processing
    await SubmissionJob.findOneAndUpdate(
      { jobId },
      { 
        status: 'processing',
        startedAt: new Date(),
        $inc: { attempts: 1 }
      }
    );

    // Validate inputs
    if (!studentId || !paperId || !answers || !Array.isArray(answers)) {
      throw new Error("Missing required data: studentId, paperId, or answers");
    }

    // Get the quiz (paper) with questions
    const paper = await Paper.findById(paperId);
    if (!paper) {
      throw new Error("Quiz not found");
    }

    console.log(`📝 Processing paper: ${paper.title} with ${paper.questions.length} questions`);

    // Analyze answers and set reviewed: true for correct, false for incorrect
    const questionResults = [];
    let score = 0;
    
    for (let i = 0; i < paper.questions.length; i++) {
      const question = paper.questions[i];
      const selectedAnswer = answers[i]?.answer;
      const isCorrect = selectedAnswer === question.correctAnswer;
      
      if (isCorrect) score++;
      
      questionResults.push({
        questionId: question._id,
        selectedAnswer,
        isCorrect,
        reviewed: isCorrect, // reviewed true if correct, false if incorrect
      });
    }

    // Create submission
    const submission = new Submission({
      studentId,
      paperId,
      instituteId,
      answers: questionResults,
      submittedAt: new Date(),
      status: "done",
      score,
    });

    await submission.save();

    // Update job status to completed
    await SubmissionJob.findOneAndUpdate(
      { jobId },
      {
        status: 'completed',
        submissionId: submission._id,
        result: {
          score,
          total: paper.questions.length,
          correctAnswers: score,
        },
        completedAt: new Date(),
      }
    );

    console.log(`✅ Submission completed - jobId: ${jobId}, submissionId: ${submission._id}, score: ${score}/${paper.questions.length}`);

    return {
      success: true,
      submissionId: submission._id,
      score,
      total: paper.questions.length,
    };

  } catch (error) {
    console.error(`❌ Error processing submission jobId: ${jobId}`, error);

    // Update job status to failed
    await SubmissionJob.findOneAndUpdate(
      { jobId },
      {
        status: 'failed',
        error: error.message,
        completedAt: new Date(),
      }
    );

    throw error;
  }
}

/**
 * Worker loop - continuously polls SQS for messages
 */
export async function startWorker() {
  console.log('🚀 Submission worker started');
  
  let isRunning = true;

  // Graceful shutdown handler
  const shutdown = async () => {
    console.log('🛑 Worker shutdown initiated...');
    isRunning = false;
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  while (isRunning) {
    try {
      // Receive messages from SQS (long polling for up to 20 seconds)
      const messages = await queueService.receiveMessages(10, 20);

      if (messages.length === 0) {
        console.log('📭 No messages in queue, waiting...');
        continue;
      }

      console.log(`📬 Received ${messages.length} message(s) from queue`);

      // Process messages in parallel (but with controlled concurrency)
      await Promise.allSettled(
        messages.map(async (message) => {
          try {
            const messageBody = JSON.parse(message.Body);
            
            // Process the submission
            await processSubmission(messageBody);

            // Delete message from queue after successful processing
            await queueService.deleteMessage(message.ReceiptHandle);
            
          } catch (error) {
            console.error('❌ Error processing message:', error);
            // Message will become visible again after visibility timeout
            // and can be retried or sent to DLQ
          }
        })
      );

    } catch (error) {
      console.error('❌ Worker error:', error);
      // Wait a bit before retrying on error
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  console.log('✅ Worker shutdown complete');
}

export default {
  processSubmission,
  startWorker,
};
