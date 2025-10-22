import express from 'express';
import {
  getSchedulerStatus,
  manualTriggerProcessing,
  cancelScheduledJob,
  restartScheduler
} from '../controllers/schedulerController.js';

const router = express.Router();

// GET /api/scheduler/status - Get scheduler status and scheduled jobs
router.get('/status', getSchedulerStatus);

// POST /api/scheduler/manual-trigger/:paperId - Manually trigger processing for a paper
router.post('/manual-trigger/:paperId', manualTriggerProcessing);

// DELETE /api/scheduler/cancel/:scheduleKey - Cancel a specific scheduled job
router.delete('/cancel/:scheduleKey', cancelScheduledJob);

// POST /api/scheduler/restart - Restart the scheduler
router.post('/restart', restartScheduler);

export default router;