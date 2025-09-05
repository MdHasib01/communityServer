import { Community } from "../models/community.model.js";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { RedditScraper } from "./platforms/RedditScraper.js";
import { TwitterScraper } from "./platforms/TwitterScraper.js";
import { LinkedInScraper } from "./platforms/LinkedInScraper.js";
import { MediumScraper } from "./platforms/MediumScraper.js";
import { ScrapingUtils } from "./utils/ScrapingUtils.js";
import { ContentProcessor } from "./utils/ContentProcessor.js";

class ScraperManager {
  constructor() {
    this.scrapers = {
      reddit: new RedditScraper(),
      twitter: new TwitterScraper(),
      linkedin: new LinkedInScraper(),
      medium: new MediumScraper(),
    };
    this.utils = new ScrapingUtils();
    this.contentProcessor = new ContentProcessor();
  }

  /**
   * Scrape content for all active communities
   */
  async scrapeAllCommunities() {
    try {
      console.log("Starting scraping for all communities...");
      
      const activeCommunities = await Community.find({ 
        isActive: true,
        "scrapingPlatforms.isActive": true 
      });

      const results = {
        totalCommunities: activeCommunities.length,
        successfulScrapes: 0,
        failedScrapes: 0,
        totalPostsCreated: 0,
        errors: [],
      };

      for (const community of activeCommunities) {
        try {
          const communityResult = await this.scrapeCommunity(community._id);
          results.successfulScrapes++;
          results.totalPostsCreated += communityResult.postsCreated;
          
          console.log(`✅ Successfully scraped ${community.name}: ${communityResult.postsCreated} posts`);
        } catch (error) {
          results.failedScrapes++;
          results.errors.push({
            community: community.name,
            error: error.message,
          });
          
          console.error(`❌ Failed to scrape ${community.name}:`, error.message);
        }
      }

      console.log("Scraping completed:", results);
      return results;
    } catch (error) {
      console.error("Error in scrapeAllCommunities:", error);
      throw error;
    }
  }

  /**
   * Scrape content for a specific community
   */
  async scrapeCommunity(communityId) {
    try {
      const community = await Community.findById(communityId);
      if (!community) {
        throw new Error("Community not found");
      }

      console.log(`Scraping community: ${community.name}`);
      
      let totalPostsCreated = 0;
      const platformResults = [];

      // Get all users for random assignment
      const users = await User.find({ _id: { $exists: true } }).select("_id");
      if (users.length === 0) {
        throw new Error("No users found for post assignment");
      }

      // Scrape from each active platform
      for (const platformConfig of community.scrapingPlatforms) {
        if (!platformConfig.isActive) continue;

        try {
          const scraper = this.scrapers[platformConfig.platform];
          if (!scraper) {
            console.warn(`No scraper available for platform: ${platformConfig.platform}`);
            continue;
          }

          console.log(`Scraping ${platformConfig.platform} for ${community.name}...`);
          
          const scrapedContent = await scraper.scrapeContent({
            sourceUrl: platformConfig.sourceUrl,
            keywords: platformConfig.keywords,
            maxPosts: community.scrapingConfig.maxPostsPerScrape || 50,
          });

          // Process and create posts
          const postsCreated = await this.createPostsFromScrapedContent(
            scrapedContent,
            community,
            platformConfig.platform,
            users
          );

          totalPostsCreated += postsCreated;
          platformResults.push({
            platform: platformConfig.platform,
            postsCreated,
            success: true,
          });

        } catch (platformError) {
          console.error(`Error scraping ${platformConfig.platform}:`, platformError.message);
          platformResults.push({
            platform: platformConfig.platform,
            postsCreated: 0,
            success: false,
            error: platformError.message,
          });
        }
      }

      // Update community's last scraped timestamp
      await Community.findByIdAndUpdate(communityId, {
        lastScrapedAt: new Date(),
        $inc: { postCount: totalPostsCreated },
      });

      return {
        communityId,
        communityName: community.name,
        postsCreated: totalPostsCreated,
        platformResults,
      };

    } catch (error) {
      console.error(`Error scraping community ${communityId}:`, error);
      throw error;
    }
  }

  /**
   * Create posts from scraped content
   */
  async createPostsFromScrapedContent(scrapedContent, community, platform, users) {
    let postsCreated = 0;

    for (const content of scrapedContent) {
      try {
        // Check if post already exists
        const existingPost = await Post.findOne({
          platform,
          originalId: content.id,
        });

        if (existingPost) {
          console.log(`Post ${content.id} already exists, skipping...`);
          continue;
        }

        // Process content quality
        const qualityScore = this.contentProcessor.calculateQualityScore(content);
        
        // Skip low-quality content
        if (qualityScore < (community.scrapingConfig.qualityThreshold || 0.5)) {
          console.log(`Post ${content.id} quality too low (${qualityScore}), skipping...`);
          continue;
        }

        // Randomly assign a user as the owner
        const randomUser = users[Math.floor(Math.random() * users.length)];

        // Process and clean content
        const processedContent = this.contentProcessor.processContent(content);

        // Create the post
        const post = await Post.create({
          title: processedContent.title,
          content: processedContent.content,
          sourceUrl: content.url,
          platform,
          originalId: content.id,
          community: community._id,
          owner: randomUser._id,
          engagementMetrics: {
            likes: content.likes || 0,
            comments: content.comments || 0,
            shares: content.shares || 0,
            views: content.views || 0,
          },
          scrapingMetadata: {
            scrapedAt: new Date(),
            originalAuthor: content.author,
            originalCreatedAt: content.createdAt,
            qualityScore,
            tags: processedContent.tags,
          },
          thumbnail: content.thumbnail,
          mediaUrls: content.mediaUrls || [],
          status: "active",
        });

        postsCreated++;
        console.log(`✅ Created post: ${post.title.substring(0, 50)}...`);

      } catch (postError) {
        console.error(`Error creating post from ${content.id}:`, postError.message);
      }
    }

    return postsCreated;
  }

  /**
   * Add a new platform scraper
   */
  async addNewPlatform(platformConfig) {
    const { name, scraperClass, config } = platformConfig;
    
    if (this.scrapers[name]) {
      throw new Error(`Platform ${name} already exists`);
    }

    this.scrapers[name] = new scraperClass(config);
    console.log(`Added new platform scraper: ${name}`);
    
    return true;
  }

  /**
   * Get scraping statistics
   */
  async getScrapingStats() {
    const stats = await Post.aggregate([
      {
        $match: {
          "scrapingMetadata.scrapedAt": {
            $gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      },
      {
        $group: {
          _id: "$platform",
          count: { $sum: 1 },
          avgQualityScore: { $avg: "$scrapingMetadata.qualityScore" },
          totalEngagement: {
            $sum: {
              $add: [
                "$engagementMetrics.likes",
                "$engagementMetrics.comments",
                "$engagementMetrics.shares",
              ],
            },
          },
        },
      },
    ]);

    return {
      last24Hours: stats,
      totalScrapedPosts: await Post.countDocuments({
        "scrapingMetadata.scrapedAt": { $exists: true },
      }),
    };
  }

  /**
   * Clean up old or low-quality posts
   */
  async cleanupPosts(options = {}) {
    const {
      olderThanDays = 30,
      minQualityScore = 0.3,
      maxPostsPerCommunity = 1000,
    } = options;

    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    
    // Mark old, low-quality posts as hidden
    const hiddenResult = await Post.updateMany(
      {
        createdAt: { $lt: cutoffDate },
        "scrapingMetadata.qualityScore": { $lt: minQualityScore },
        status: "active",
      },
      { status: "hidden" }
    );

    console.log(`Hidden ${hiddenResult.modifiedCount} old, low-quality posts`);

    // For each community, keep only the most recent posts
    const communities = await Community.find({ isActive: true });
    
    for (const community of communities) {
      const excessPosts = await Post.find({
        community: community._id,
        status: "active",
      })
        .sort({ createdAt: -1 })
        .skip(maxPostsPerCommunity);

      if (excessPosts.length > 0) {
        await Post.updateMany(
          { _id: { $in: excessPosts.map(p => p._id) } },
          { status: "hidden" }
        );
        
        console.log(`Hidden ${excessPosts.length} excess posts from ${community.name}`);
      }
    }

    return {
      hiddenLowQuality: hiddenResult.modifiedCount,
      totalCleaned: hiddenResult.modifiedCount + excessPosts?.length || 0,
    };
  }
}

export { ScraperManager };