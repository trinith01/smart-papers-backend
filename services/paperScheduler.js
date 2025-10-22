import cron from 'node-cron';
import Paper from '../models/Paper.js';
import { buildPaperStats } from '../controllers/paperStatControllers.js';
import { calculateRanks } from '../controllers/submissionController.js';

class PaperScheduler {
  constructor() {
    this.scheduledJobs = new Map();
    this.checkInterval = null;
  }

  /**
   * Initialize the scheduler - check for papers that need scheduling every minute
   */
  init() {
    console.log('📅 Paper Scheduler initialized');
    
    // Check every minute for papers that need to be scheduled
    this.checkInterval = cron.schedule('* * * * *', async () => {
      await this.checkAndSchedulePapers();
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    // Also check immediately on startup
    this.checkAndSchedulePapers();
  }

  /**
   * Check for papers that need scheduling and schedule them
   */
  async checkAndSchedulePapers() {
    try {
      const now = new Date();
      const futureTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // Check papers ending in next 2 hours
      
      // Find papers with availability that ends in the future but hasn't been processed yet
      const papers = await Paper.find({
        'availability.endTime': {
          $gte: now,
          $lte: futureTime
        }
      }).lean();

      for (const paper of papers) {
        for (const availability of paper.availability) {
          const scheduleKey = `${paper._id}_${availability.institute}`;
          
          // Skip if already scheduled
          if (this.scheduledJobs.has(scheduleKey)) {
            continue;
          }

          const endTime = new Date(availability.endTime);
          
          // Skip if already passed
          if (endTime <= now) {
            continue;
          }

          // Schedule the job to run 1 minute after end time
          const triggerTime = new Date(endTime.getTime() + 60 * 1000);
          
          this.schedulePostPaperProcessing(paper._id, scheduleKey, triggerTime);
        }
      }
    } catch (error) {
      console.error('❌ Error checking papers for scheduling:', error);
    }
  }

  /**
   * Schedule post-paper processing (stats building and rank calculation)
   */
  schedulePostPaperProcessing(paperId, scheduleKey, triggerTime) {
    const now = new Date();
    
    // If the trigger time is in the past, execute immediately
    if (triggerTime <= now) {
      console.log(`⚡ Executing post-paper processing immediately for paper: ${paperId}`);
      this.executePostPaperProcessing(paperId, scheduleKey);
      return;
    }

    // Calculate cron expression for the specific time
    const cronExpression = this.dateToCronExpression(triggerTime);
    
    console.log(`📅 Scheduling post-paper processing for paper: ${paperId} at ${triggerTime.toISOString()}`);
    
    // Schedule the job
    const job = cron.schedule(cronExpression, async () => {
      await this.executePostPaperProcessing(paperId, scheduleKey);
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    // Store the job reference
    this.scheduledJobs.set(scheduleKey, {
      job,
      paperId,
      triggerTime,
      scheduled: true
    });
  }

  /**
   * Execute the post-paper processing
   */
  async executePostPaperProcessing(paperId, scheduleKey) {
    try {
      console.log(`🔄 Starting post-paper processing for paper: ${paperId}`);

      // Create mock request and response objects for the controllers
      const mockReq = { params: { paperId } };
      const mockRes = {
        status: (code) => ({
          json: (data) => {
            console.log(`📊 Stats build response (${code}):`, data.ok ? 'Success' : data.error);
            return mockRes;
          }
        }),
        json: (data) => {
          console.log(`📊 Stats response:`, data.ok ? 'Success' : data.error);
          return mockRes;
        }
      };

      const mockRankRes = {
        status: (code) => ({
          json: (data) => {
            console.log(`🏆 Rank calculation response (${code}):`, data.ok ? 'Success' : data.message);
            return mockRankRes;
          }
        }),
        json: (data) => {
          console.log(`🏆 Rank response:`, data.ok ? 'Success' : data.message);
          return mockRankRes;
        }
      };

      // 1. Build paper stats
      console.log(`📊 Building stats for paper: ${paperId}`);
      await buildPaperStats(mockReq, mockRes);
      
      // Wait a moment between operations
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 2. Calculate rankings
      console.log(`🏆 Calculating ranks for paper: ${paperId}`);
      await calculateRanks(mockReq, mockRankRes);

      console.log(`✅ Post-paper processing completed for paper: ${paperId}`);

    } catch (error) {
      console.error(`❌ Error in post-paper processing for paper ${paperId}:`, error);
    } finally {
      // Clean up the scheduled job
      const jobInfo = this.scheduledJobs.get(scheduleKey);
      if (jobInfo && jobInfo.job) {
        jobInfo.job.destroy();
      }
      this.scheduledJobs.delete(scheduleKey);
      console.log(`🧹 Cleaned up scheduled job: ${scheduleKey}`);
    }
  }

  /**
   * Convert a Date object to a cron expression
   */
  dateToCronExpression(date) {
    const minute = date.getUTCMinutes();
    const hour = date.getUTCHours();
    const day = date.getUTCDate();
    const month = date.getUTCMonth() + 1;
    
    // Run only once at the specific time
    return `${minute} ${hour} ${day} ${month} *`;
  }

  /**
   * Manually trigger processing for a specific paper
   */
  async triggerManualProcessing(paperId) {
    const scheduleKey = `manual_${paperId}_${Date.now()}`;
    await this.executePostPaperProcessing(paperId, scheduleKey);
  }

  /**
   * Get information about scheduled jobs
   */
  getScheduledJobs() {
    const jobs = Array.from(this.scheduledJobs.entries()).map(([key, info]) => ({
      scheduleKey: key,
      paperId: info.paperId,
      triggerTime: info.triggerTime,
      scheduled: info.scheduled
    }));
    
    return {
      totalJobs: jobs.length,
      jobs
    };
  }

  /**
   * Cancel a specific scheduled job
   */
  cancelJob(scheduleKey) {
    const jobInfo = this.scheduledJobs.get(scheduleKey);
    if (jobInfo && jobInfo.job) {
      jobInfo.job.destroy();
      this.scheduledJobs.delete(scheduleKey);
      console.log(`🚫 Cancelled scheduled job: ${scheduleKey}`);
      return true;
    }
    return false;
  }

  /**
   * Stop the scheduler
   */
  stop() {
    // Stop the main checking interval
    if (this.checkInterval) {
      this.checkInterval.destroy();
    }

    // Stop all scheduled jobs
    for (const [key, jobInfo] of this.scheduledJobs.entries()) {
      if (jobInfo.job) {
        jobInfo.job.destroy();
      }
    }

    this.scheduledJobs.clear();
    console.log('🛑 Paper Scheduler stopped');
  }
}

// Create and export a singleton instance
const paperScheduler = new PaperScheduler();

export default paperScheduler;