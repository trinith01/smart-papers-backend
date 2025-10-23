import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { v4 as uuidv4 } from 'uuid';

class QueueService {
  constructor() {
    this.sqsClient = new SQSClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    
    this.queueUrl = process.env.SQS_QUEUE_URL;
  }

  /**
   * Send a submission to the queue
   * @param {Object} submissionData - The submission data
   * @returns {Promise<string>} jobId - Unique job identifier
   */
  async enqueueSubmission(submissionData) {
    const { jobId } = submissionData;
    const messageBody = {
      ...submissionData,
      enqueuedAt: new Date().toISOString(),
    };

    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(messageBody),
      MessageAttributes: {
        JobId: {
          DataType: 'String',
          StringValue: jobId,
        },
        StudentId: {
          DataType: 'String',
          StringValue: submissionData.studentId.toString(),
        },
        PaperId: {
          DataType: 'String',
          StringValue: submissionData.paperId.toString(),
        },
      },
    });

    try {
      const response = await this.sqsClient.send(command);
      console.log(`✅ Submission enqueued with jobId: ${jobId}, MessageId: ${response.MessageId}`);
      return jobId;
    } catch (error) {
      console.error('❌ Error enqueueing submission:', error);
      throw new Error(`Failed to enqueue submission: ${error.message}`);
    }
  }

  /**
   * Receive messages from the queue
   * @param {number} maxMessages - Maximum number of messages to receive (1-10)
   * @param {number} waitTimeSeconds - Long polling wait time (0-20)
   * @returns {Promise<Array>} messages
   */
  async receiveMessages(maxMessages = 1, waitTimeSeconds = 20) {
    const command = new ReceiveMessageCommand({
      QueueUrl: this.queueUrl,
      MaxNumberOfMessages: maxMessages,
      WaitTimeSeconds: waitTimeSeconds, // Long polling
      MessageAttributeNames: ['All'],
      VisibilityTimeout: 300, // 5 minutes to process
    });

    try {
      const response = await this.sqsClient.send(command);
      return response.Messages || [];
    } catch (error) {
      console.error('❌ Error receiving messages:', error);
      throw error;
    }
  }

  /**
   * Delete a message from the queue after successful processing
   * @param {string} receiptHandle - The receipt handle of the message
   */
  async deleteMessage(receiptHandle) {
    const command = new DeleteMessageCommand({
      QueueUrl: this.queueUrl,
      ReceiptHandle: receiptHandle,
    });

    try {
      await this.sqsClient.send(command);
      console.log('✅ Message deleted from queue');
    } catch (error) {
      console.error('❌ Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Validate SQS configuration
   */
  validateConfig() {
    const requiredEnvVars = [
      'AWS_REGION',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'SQS_QUEUE_URL',
    ];

    const missing = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    console.log('✅ SQS configuration validated');
  }
}

// Singleton instance
const queueService = new QueueService();

export default queueService;
