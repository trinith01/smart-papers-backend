import paperScheduler from '../services/paperScheduler.js';

/**
 * GET /api/scheduler/status
 * Get the current status of the paper scheduler
 */
export const getSchedulerStatus = async (req, res) => {
  try {
    const jobsInfo = paperScheduler.getScheduledJobs();
    
    res.status(200).json({
      ok: true,
      message: 'Scheduler status retrieved successfully',
      data: {
        isRunning: true,
        ...jobsInfo,
        currentTime: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to get scheduler status',
      error: error.message
    });
  }
};

/**
 * POST /api/scheduler/manual-trigger/:paperId
 * Manually trigger post-paper processing for a specific paper
 */
export const manualTriggerProcessing = async (req, res) => {
  try {
    const { paperId } = req.params;
    
    if (!paperId) {
      return res.status(400).json({
        ok: false,
        message: 'Paper ID is required'
      });
    }

    // Trigger the processing
    await paperScheduler.triggerManualProcessing(paperId);
    
    res.status(200).json({
      ok: true,
      message: `Manual processing triggered successfully for paper: ${paperId}`,
      paperId
    });
  } catch (error) {
    console.error('Error in manual trigger:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to trigger manual processing',
      error: error.message
    });
  }
};

/**
 * DELETE /api/scheduler/cancel/:scheduleKey
 * Cancel a specific scheduled job
 */
export const cancelScheduledJob = async (req, res) => {
  try {
    const { scheduleKey } = req.params;
    
    if (!scheduleKey) {
      return res.status(400).json({
        ok: false,
        message: 'Schedule key is required'
      });
    }

    const cancelled = paperScheduler.cancelJob(scheduleKey);
    
    if (cancelled) {
      res.status(200).json({
        ok: true,
        message: `Scheduled job cancelled successfully: ${scheduleKey}`,
        scheduleKey
      });
    } else {
      res.status(404).json({
        ok: false,
        message: `Scheduled job not found: ${scheduleKey}`,
        scheduleKey
      });
    }
  } catch (error) {
    console.error('Error cancelling job:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to cancel scheduled job',
      error: error.message
    });
  }
};

/**
 * POST /api/scheduler/restart
 * Restart the scheduler (useful for development or troubleshooting)
 */
export const restartScheduler = async (req, res) => {
  try {
    // Stop the current scheduler
    paperScheduler.stop();
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Restart it
    paperScheduler.init();
    
    res.status(200).json({
      ok: true,
      message: 'Scheduler restarted successfully',
      restartTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error restarting scheduler:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to restart scheduler',
      error: error.message
    });
  }
};