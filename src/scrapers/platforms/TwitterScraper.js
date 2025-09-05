import axios from "axios";
import { ScrapingUtils } from "../utils/ScrapingUtils.js";

class TwitterScraper {
  constructor() {
    this.baseUrl = "https://api.twitter.com/2";
    this.utils = new ScrapingUtils();
    this.rateLimitDelay = 1000; // 1 second between requests
    
    // Note: This is a placeholder implementation
    // In production, you'd need Twitter API credentials
    this.apiKey = process.env.TWITTER_API_KEY;
    this.apiSecret = process.env.TWITTER_API_SECRET;
    this.bearerToken = process.env.TWITTER_BEARER_TOKEN;
  }

  /**
   * Scrape content from Twitter
   * Note: This is a simplified implementation for demonstration
   */
  async scrapeContent(config) {
    const { sourceUrl, keywords = [], maxPosts = 50 } = config;
    
    try {
      console.log(`Scraping Twitter: ${sourceUrl}`);
      
      // For demo purposes, return mock data
      // In production, implement actual Twitter API calls
      return this.getMockTwitterData(maxPosts, keywords);

    } catch (error) {
      console.error("Twitter scraping error:", error.message);
      throw new Error(`Twitter scraping failed: ${error.message}`);
    }
  }

  /**
   * Mock Twitter data for demonstration
   * Replace with actual Twitter API implementation
   */
  getMockTwitterData(maxPosts, keywords) {
    const mockPosts = [];
    const businessTopics = [
      "startup funding", "entrepreneurship", "business strategy", "marketing tips",
      "SaaS growth", "e-commerce trends", "business automation", "leadership",
      "productivity hacks", "business networking", "sales strategies", "customer success"
    ];

    for (let i = 0; i < Math.min(maxPosts, 20); i++) {
      const topic = businessTopics[Math.floor(Math.random() * businessTopics.length)];
      const mockPost = {
        id: `twitter_${Date.now()}_${i}`,
        title: `Insights on ${topic}`,
        content: `Great discussion about ${topic}. Here are some key takeaways that every entrepreneur should know. Thread 🧵 #business #startup #entrepreneur`,
        url: `https://twitter.com/businessuser/status/${Date.now()}${i}`,
        author: `business_expert_${i % 5 + 1}`,
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        likes: Math.floor(Math.random() * 1000) + 10,
        comments: Math.floor(Math.random() * 100) + 5,
        shares: Math.floor(Math.random() * 50) + 2,
        views: Math.floor(Math.random() * 10000) + 100,
        thumbnail: null,
        mediaUrls: [],
        tags: ["business", "startup", "entrepreneur", topic.replace(" ", "")],
        platform: "twitter",
        isThread: Math.random() > 0.7,
        retweetCount: Math.floor(Math.random() * 200),
      };

      // Filter by keywords if provided
      if (keywords.length === 0 || this.matchesKeywords(mockPost, keywords)) {
        mockPosts.push(mockPost);
      }
    }

    return mockPosts;
  }

  /**
   * Actual Twitter API implementation (placeholder)
   */
  async fetchTweets(query, maxResults = 50) {
    if (!this.bearerToken) {
      throw new Error("Twitter Bearer Token not configured");
    }

    try {
      const response = await axios.get(`${this.baseUrl}/tweets/search/recent`, {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
        },
        params: {
          query,
          max_results: Math.min(maxResults, 100),
          'tweet.fields': 'created_at,author_id,public_metrics,context_annotations',
          'user.fields': 'username,name,profile_image_url',
          'expansions': 'author_id',
        },
      });

      return this.transformTwitterResponse(response.data);

    } catch (error) {
      if (error.response?.status === 429) {
        console.log("Twitter rate limited, waiting...");
        await this.utils.delay(15 * 60 * 1000); // Wait 15 minutes
        return this.fetchTweets(query, maxResults);
      }
      
      throw error;
    }
  }

  /**
   * Transform Twitter API response to our standard format
   */
  transformTwitterResponse(twitterData) {
    if (!twitterData.data) return [];

    const users = {};
    if (twitterData.includes?.users) {
      twitterData.includes.users.forEach(user => {
        users[user.id] = user;
      });
    }

    return twitterData.data.map(tweet => {
      const author = users[tweet.author_id];
      
      return {
        id: tweet.id,
        title: this.extractTitle(tweet.text),
        content: tweet.text,
        url: `https://twitter.com/${author?.username}/status/${tweet.id}`,
        author: author?.username || 'unknown',
        createdAt: new Date(tweet.created_at),
        likes: tweet.public_metrics?.like_count || 0,
        comments: tweet.public_metrics?.reply_count || 0,
        shares: tweet.public_metrics?.retweet_count || 0,
        views: tweet.public_metrics?.impression_count || 0,
        thumbnail: author?.profile_image_url,
        mediaUrls: this.extractMediaUrls(tweet),
        tags: this.extractTags(tweet),
        platform: "twitter",
        retweetCount: tweet.public_metrics?.retweet_count || 0,
        quoteCount: tweet.public_metrics?.quote_count || 0,
      };
    });
  }

  /**
   * Extract title from tweet text
   */
  extractTitle(text) {
    // Use first sentence or first 100 characters as title
    const firstSentence = text.split(/[.!?]/)[0];
    return firstSentence.length > 100 
      ? text.substring(0, 100) + "..."
      : firstSentence;
  }

  /**
   * Extract media URLs from tweet
   */
  extractMediaUrls(tweet) {
    const mediaUrls = [];
    
    // Extract URLs from tweet text
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = tweet.text.match(urlRegex);
    
    if (urls) {
      urls.forEach(url => {
        if (this.utils.isImageUrl(url)) {
          mediaUrls.push({
            type: "image",
            url: url,
          });
        } else if (this.utils.isVideoUrl(url)) {
          mediaUrls.push({
            type: "video",
            url: url,
          });
        }
      });
    }
    
    return mediaUrls;
  }

  /**
   * Extract tags from tweet
   */
  extractTags(tweet) {
    const tags = [];
    
    // Extract hashtags
    const hashtags = tweet.text.match(/#\w+/g);
    if (hashtags) {
      tags.push(...hashtags.map(tag => tag.toLowerCase().substring(1)));
    }
    
    // Extract mentions (as potential topics)
    const mentions = tweet.text.match(/@\w+/g);
    if (mentions) {
      tags.push(...mentions.map(mention => mention.toLowerCase().substring(1)));
    }
    
    // Add context annotations as tags
    if (tweet.context_annotations) {
      tweet.context_annotations.forEach(annotation => {
        if (annotation.entity?.name) {
          tags.push(annotation.entity.name.toLowerCase().replace(/\s+/g, '-'));
        }
      });
    }
    
    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Check if tweet matches keywords
   */
  matchesKeywords(tweet, keywords) {
    const searchText = `${tweet.content} ${tweet.tags.join(' ')}`.toLowerCase();
    
    return keywords.some(keyword => 
      searchText.includes(keyword.toLowerCase())
    );
  }

  /**
   * Get user information
   */
  async getUserInfo(username) {
    if (!this.bearerToken) {
      throw new Error("Twitter Bearer Token not configured");
    }

    try {
      const response = await axios.get(`${this.baseUrl}/users/by/username/${username}`, {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
        },
        params: {
          'user.fields': 'created_at,description,public_metrics,profile_image_url',
        },
      });

      const user = response.data.data;
      return {
        id: user.id,
        username: user.username,
        name: user.name,
        description: user.description,
        followers: user.public_metrics?.followers_count || 0,
        following: user.public_metrics?.following_count || 0,
        tweets: user.public_metrics?.tweet_count || 0,
        profileImage: user.profile_image_url,
        created: new Date(user.created_at),
      };
    } catch (error) {
      console.error(`Error fetching Twitter user info for @${username}:`, error.message);
      return null;
    }
  }

  /**
   * Search tweets by hashtag or keyword
   */
  async searchTweets(query, options = {}) {
    const {
      maxResults = 50,
      resultType = 'recent', // recent, popular, mixed
      lang = 'en',
    } = options;

    // Build search query
    let searchQuery = query;
    if (!query.startsWith('#') && !query.includes(':')) {
      searchQuery = `${query} -is:retweet lang:${lang}`;
    }

    return this.fetchTweets(searchQuery, maxResults);
  }
}

export { TwitterScraper };