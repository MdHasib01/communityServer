import cron from "node-cron";
import { ScraperManager } from "../scrapers/ScraperManager.js";
import { Community } from "../models/community.model.js";

class SchedulerService {
  constructor() {
    this.scraperManager = new ScraperManager();
    this.jobs = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize the scheduler service
   */
  async initialize() {
    if (this.isInitialized) {
      console.log("Scheduler service already initialized");
      return;
    }

    console.log("Initializing scheduler service...");
    
    try {
      // Schedule scraping jobs based on community configurations
      await this.scheduleScrapingJobs();
      
      // Schedule cleanup job (daily at 2 AM)
      this.scheduleCleanupJob();
      
      // Schedule stats update job (every 6 hours)
      this.scheduleStatsUpdateJob();
      
      this.isInitialized = true;
      console.log("✅ Scheduler service initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize scheduler service:", error);
      throw error;
    }
  }

  /**
   * Schedule scraping jobs for all communities
   */
  async scheduleScrapingJobs() {
    try {
      const communities = await Community.find({ 
        isActive: true,
        "scrapingPlatforms.isActive": true 
      });

      console.log(`Setting up scraping schedules for ${communities.length} communities`);

      for (const community of communities) {
        this.scheduleCommunityScrapingJob(community);
      }
    } catch (error) {
      console.error("Error scheduling scraping jobs:", error);
      throw error;
    }
  }

  /**
   * Schedule scraping job for a specific community
   */
  scheduleCommunityScrapingJob(community) {
    const jobId = `scrape_${community._id}`;
    
    // Stop existing job if it exists
    if (this.jobs.has(jobId)) {
      this.jobs.get(jobId).stop();
      this.jobs.delete(jobId);
    }

    // Determine cron schedule based on frequency
    let cronSchedule;
    switch (community.scrapingConfig.frequency) {
      case 'hourly':
        cronSchedule = '0 * * * *'; // Every hour
        break;
      case 'daily':
        cronSchedule = '0 8 * * *'; // Daily at 8 AM
        break;
      case 'weekly':
        cronSchedule = '0 8 * * 1'; // Weekly on Monday at 8 AM
        break;
      default:
        cronSchedule = '0 8 * * *'; // Default to daily
    }

    // Create and start the cron job
    const job = cron.schedule(cronSchedule, async () => {
      console.log(`🔄 Starting scheduled scraping for community: ${community.name}`);
      
      try {
        const result = await this.scraperManager.scrapeCommunity(community._id);
        console.log(`✅ Scheduled scraping completed for ${community.name}: ${result.postsCreated} posts created`);
      } catch (error) {
        console.error(`❌ Scheduled scraping failed for ${community.name}:`, error.message);
      }
    }, {
      scheduled: true,
      timezone: "UTC"
    });

    this.jobs.set(jobId, job);
    console.log(`📅 Scheduled ${community.scrapingConfig.frequency} scraping for ${community.name}`);
  }

  /**
   * Schedule cleanup job
   */
  scheduleCleanupJob() {
    const jobId = 'cleanup_posts';
    
    // Stop existing job if it exists
    if (this.jobs.has(jobId)) {
      this.jobs.get(jobId).stop();
      this.jobs.delete(jobId);
    }

    // Daily cleanup at 2 AM UTC
    const job = cron.schedule('0 2 * * *', async () => {
      console.log('🧹 Starting scheduled post cleanup...');
      
      try {
        const result = await this.scraperManager.cleanupPosts({
          olderThanDays: 30,
          minQualityScore: 0.3,
          maxPostsPerCommunity: 1000,
        });
        
        console.log(`✅ Scheduled cleanup completed: ${result.totalCleaned} posts cleaned`);
      } catch (error) {
        console.error('❌ Scheduled cleanup failed:', error.message);
      }
    }, {
      scheduled: true,
      timezone: "UTC"
    });

    this.jobs.set(jobId, job);
    console.log('📅 Scheduled daily post cleanup at 2 AM UTC');
  }

  /**
   * Schedule stats update job
   */
  scheduleStatsUpdateJob() {
    const jobId = 'update_stats';
    
    // Stop existing job if it exists
    if (this.jobs.has(jobId)) {
      this.jobs.get(jobId).stop();
      this.jobs.delete(jobId);
    }

    // Every 6 hours
    const job = cron.schedule('0 */6 * * *', async () => {
      console.log('📊 Starting scheduled stats update...');
      
      try {
        await this.updateCommunityStats();
        console.log('✅ Scheduled stats update completed');
      } catch (error) {
        console.error('❌ Scheduled stats update failed:', error.message);
      }
    }, {
      scheduled: true,
      timezone: "UTC"
    });

    this.jobs.set(jobId, job);
    console.log('📅 Scheduled stats update every 6 hours');
  }

  /**
   * Update community statistics
   */
  async updateCommunityStats() {
    try {
      const communities = await Community.find({ isActive: true });
      
      for (const community of communities) {
        // This would typically update cached statistics
        // For now, we'll just log the update
        console.log(`Updating stats for community: ${community.name}`);
      }
    } catch (error) {
      console.error('Error updating community stats:', error);
      throw error;
    }
  }

  /**
   * Add or update a community's scraping schedule
   */
  async updateCommunitySchedule(communityId) {
    try {
      const community = await Community.findById(communityId);
      if (!community) {
        throw new Error('Community not found');
      }

      this.scheduleCommunityScrapingJob(community);
      console.log(`Updated scraping schedule for community: ${community.name}`);
    } catch (error) {
      console.error(`Error updating community schedule:`, error);
      throw error;
    }
  }

  /**
   * Remove a community's scraping schedule
   */
  removeCommunitySchedule(communityId) {
    const jobId = `scrape_${communityId}`;
    
    if (this.jobs.has(jobId)) {
      this.jobs.get(jobId).stop();
      this.jobs.delete(jobId);
      console.log(`Removed scraping schedule for community: ${communityId}`);
    }
  }

  /**
   * Get all active jobs
   */
  getActiveJobs() {
    const activeJobs = [];
    
    for (const [jobId, job] of this.jobs.entries()) {
      activeJobs.push({
        id: jobId,
        running: job.running,
        scheduled: job.scheduled,
      });
    }
    
    return activeJobs;
  }

  /**
   * Stop all scheduled jobs
   */
  stopAllJobs() {
    console.log('Stopping all scheduled jobs...');
    
    for (const [jobId, job] of this.jobs.entries()) {
      job.stop();
      console.log(`Stopped job: ${jobId}`);
    }
    
    this.jobs.clear();
    this.isInitialized = false;
    console.log('All scheduled jobs stopped');
  }

  /**
   * Restart all jobs
   */
  async restartAllJobs() {
    this.stopAllJobs();
    await this.initialize();
  }

  /**
   * Run immediate scraping for all communities (manual trigger)
   */
  async runImmediateScraping() {
    console.log('🚀 Running immediate scraping for all communities...');
    
    try {
      const result = await this.scraperManager.scrapeAllCommunities();
      console.log('✅ Immediate scraping completed:', result);
      return result;
    } catch (error) {
      console.error('❌ Immediate scraping failed:', error);
      throw error;
    }
  }
}

// Create singleton instance
const schedulerService = new SchedulerService();

export { schedulerService, SchedulerService };