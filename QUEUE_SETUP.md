# Queue-Based Submission System - Setup Guide

## Architecture Overview

The system now uses AWS SQS (Simple Queue Service) for handling burst traffic:

```
Student Submission → API Server → SQS Queue → Worker Process → MongoDB
                         ↓
                    Immediate Response (jobId)
                         ↓
                    Frontend Polls Status
```

## Benefits

- **Handles burst traffic**: Can queue 1000+ concurrent submissions
- **Graceful degradation**: No rejected requests, everything is queued
- **Scalable workers**: Run multiple worker processes independently
- **Retry logic**: Failed submissions are retried automatically
- **Status tracking**: Real-time status updates for submissions

## Setup Instructions

### 1. Create AWS SQS Queue

1. Log into AWS Console → SQS
2. Create a new queue with these settings:

   - **Name**: `smartpapers-submission-queue`
   - **Type**: Standard Queue
   - **Visibility Timeout**: 300 seconds (5 minutes)
   - **Message Retention**: 4 days
   - **Receive Message Wait Time**: 20 seconds (enables long polling)
   - **Dead Letter Queue**: Optional but recommended

3. (Optional) Create Dead Letter Queue:

   - Name: `smartpapers-submission-dlq`
   - Configure main queue to send failed messages after 3 retries

4. Note down the Queue URL (looks like: https://sqs.us-east-1.amazonaws.com/123456789/smartpapers-submission-queue)

### 2. Create IAM User for SQS Access

1. Go to IAM → Users → Create User
2. User name: `smartpapers-sqs-user`
3. Attach policy: Create inline policy with these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": "arn:aws:sqs:us-east-1:YOUR-ACCOUNT-ID:smartpapers-submission-queue"
    }
  ]
}
```

4. Create access keys and note down:
   - Access Key ID
   - Secret Access Key

### 3. Update Backend Environment Variables

Add to `/backend/.env`:

```bash
# AWS SQS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/your-account-id/smartpapers-submission-queue
```

### 4. Running the System

#### Development Mode

Terminal 1 - API Server:

```bash
cd backend
npm run dev
```

Terminal 2 - Worker Process:

```bash
cd backend
npm run worker:dev
```

#### Production Mode

Using PM2 (recommended):

```bash
# Install PM2 globally
npm install -g pm2

# Start API server
pm2 start npm --name "smartpapers-api" -- start

# Start worker (you can run multiple workers)
pm2 start npm --name "smartpapers-worker-1" -- run worker
pm2 start npm --name "smartpapers-worker-2" -- run worker
pm2 start npm --name "smartpapers-worker-3" -- run worker

# Save configuration
pm2 save

# Setup auto-restart on system boot
pm2 startup
```

### 5. Monitoring

#### Check Queue Status

AWS Console → SQS → Your Queue → Monitoring tab

Key metrics:

- **Messages Available**: Queued submissions waiting to be processed
- **Messages in Flight**: Currently being processed
- **Oldest Message**: How long messages are waiting

#### Check Worker Logs

```bash
# PM2 logs
pm2 logs smartpapers-worker-1

# Docker logs
docker logs smartpapers-worker-1
```

#### MongoDB Queries

Check job status:

```javascript
// Recent jobs
db.submissionjobs.find().sort({ createdAt: -1 }).limit(10);

// Failed jobs
db.submissionjobs.find({ status: "failed" });

// Processing time
db.submissionjobs.aggregate([
  { $match: { status: "completed" } },
  {
    $project: {
      processingTime: {
        $subtract: ["$completedAt", "$createdAt"],
      },
    },
  },
  {
    $group: {
      _id: null,
      avgProcessingTime: { $avg: "$processingTime" },
    },
  },
]);
```

## Scaling Guidelines

### Horizontal Scaling (Recommended)

Run multiple worker processes based on load:

- **Light load** (< 100 submissions/hour): 1 worker
- **Medium load** (100-500 submissions/hour): 2-3 workers
- **Heavy load** (500-2000 submissions/hour): 5-10 workers
- **Peak traffic** (exam time): 10-20 workers

Each worker can process ~10-20 submissions per minute.

### Vertical Scaling

Increase worker performance:

- More CPU cores (Node.js is single-threaded per process)
- More RAM if processing large papers
- Faster MongoDB connection

### Cost Optimization

AWS SQS pricing (as of 2025):

- First 1 million requests/month: FREE
- After that: $0.40 per million requests
- 1000 submissions = ~2000 requests (send + receive)
- Cost for 100k submissions/month: ~$0.08

### Burst Handling

The system can handle these burst scenarios:

| Scenario        | Queue Capacity | Worker Count | Processing Time |
| --------------- | -------------- | ------------ | --------------- |
| 100 concurrent  | Instant        | 2 workers    | ~5 minutes      |
| 500 concurrent  | Instant        | 5 workers    | ~5 minutes      |
| 1000 concurrent | Instant        | 10 workers   | ~5 minutes      |
| 5000 concurrent | Instant        | 20 workers   | ~10 minutes     |

## Troubleshooting

### Submissions not processing

1. Check worker is running: `pm2 list`
2. Check worker logs: `pm2 logs smartpapers-worker-1`
3. Check SQS queue has messages: AWS Console
4. Verify environment variables are set correctly

### High processing time

1. Check MongoDB connection pool size
2. Add more worker processes
3. Check network latency to AWS/MongoDB
4. Monitor CPU/RAM usage

### Failed submissions

1. Check dead letter queue (if configured)
2. Query failed jobs: `db.submissionjobs.find({ status: "failed" })`
3. Check error messages in job documents
4. Manually retry: Update job status to "queued" and it will be retried

## API Changes

### POST /api/submissions

**Before:**

```json
Response: 201 Created
{
  "message": "Submission successful",
  "submissionId": "...",
  "score": 15,
  "total": 20
}
```

**After:**

```json
Response: 202 Accepted
{
  "message": "Submission queued for processing",
  "jobId": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
  "status": "queued",
  "statusUrl": "/api/submissions/status/{jobId}"
}
```

### GET /api/submissions/status/:jobId (NEW)

```json
Response: 200 OK
{
  "jobId": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
  "status": "completed",
  "createdAt": "2025-10-23T10:30:00Z",
  "completedAt": "2025-10-23T10:30:03Z",
  "result": {
    "submissionId": "...",
    "score": 15,
    "total": 20,
    "correctAnswers": 15
  }
}
```

Status values: `queued`, `processing`, `completed`, `failed`

## Frontend Changes

The frontend now:

1. Shows loading state while submitting
2. Receives jobId immediately
3. Polls status endpoint every 2 seconds
4. Shows success when processing completes
5. Handles failure gracefully with retry option

## Rollback Plan

If you need to rollback to synchronous processing:

1. Stop all workers: `pm2 stop smartpapers-worker-*`
2. In `submissionController.js`, replace the `createSubmission` function with the old version from git history
3. Frontend will still work (handles both 201 and 202 status codes)

## Next Steps

Consider adding:

- Redis cache for paper data (reduce DB queries)
- WebSocket notifications instead of polling
- Analytics dashboard for queue metrics
- Auto-scaling based on queue depth
- Rate limiting per student/institute
