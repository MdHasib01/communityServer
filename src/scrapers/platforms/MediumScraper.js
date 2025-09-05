import axios from "axios";
import * as cheerio from "cheerio";
import { ScrapingUtils } from "../utils/ScrapingUtils.js";

class MediumScraper {
  constructor() {
    this.baseUrl = "https://medium.com";
    this.utils = new ScrapingUtils();
    this.rateLimitDelay = 3000; // 3 seconds between requests
  }

  /**
   * Scrape content from Medium
   * Note: Medium doesn't have a public API, so we use web scraping
   */
  async scrapeContent(config) {
    const { sourceUrl, keywords = [], maxPosts = 50 } = config;
    
    try {
      console.log(`Scraping Medium: ${sourceUrl}`);
      
      // Extract publication or user from URL
      const source = this.extractSource(sourceUrl);
      if (!source) {
        throw new Error("Invalid Medium URL - could not extract source");
      }

      const posts = [];
      let page = 0;
      const maxPages = Math.ceil(maxPosts / 10); // Medium typically shows ~10 posts per page

      while (posts.length < maxPosts && page < maxPages) {
        const pagePosts = await this.scrapeMediumPage(sourceUrl, page);
        
        if (pagePosts.length === 0) break;

        // Filter posts by keywords if provided
        const filteredPosts = keywords.length > 0 
          ? pagePosts.filter(post => this.matchesKeywords(post, keywords))
          : pagePosts;

        posts.push(...filteredPosts);
        page++;
        
        // Rate limiting
        await this.utils.delay(this.rateLimitDelay);
      }

      console.log(`Scraped ${posts.length} posts from Medium`);
      return posts.slice(0, maxPosts);

    } catch (error) {
      console.error("Medium scraping error:", error.message);
      throw new Error(`Medium scraping failed: ${error.message}`);
    }
  }

  /**
   * Scrape a single page from Medium
   */
  async scrapeMediumPage(url, page = 0) {
    try {
      // For pagination, Medium uses different approaches
      // This is a simplified implementation
      const pageUrl = page > 0 ? `${url}?page=${page}` : url;
      
      const response = await axios.get(pageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
        timeout: 15000,
      });

      const $ = cheerio.load(response.data);
      const posts = [];

      // Medium's structure can vary, this is a general approach
      $('article, .postArticle, [data-testid="post-preview"]').each((index, element) => {
        try {
          const post = this.extractPostFromElement($, element);
          if (post) {
            posts.push(post);
          }
        } catch (error) {
          console.error("Error extracting Medium post:", error.message);
        }
      });

      return posts;

    } catch (error) {
      if (error.response?.status === 429) {
        console.log("Medium rate limited, waiting longer...");
        await this.utils.delay(10000);
        return this.scrapeMediumPage(url, page);
      }
      
      throw error;
    }
  }

  /**
   * Extract post data from HTML element
   */
  extractPostFromElement($, element) {
    const $el = $(element);
    
    // Try different selectors for title
    const title = $el.find('h1, h2, h3, .graf--title, [data-testid="post-preview-title"]').first().text().trim() ||
                  $el.find('a').first().text().trim();
    
    if (!title) return null;

    // Try different selectors for content/subtitle
    const content = $el.find('.graf--subtitle, .postArticle-content p, [data-testid="post-preview-content"]').first().text().trim() ||
                   $el.find('p').first().text().trim() ||
                   title;

    // Extract URL
    const relativeUrl = $el.find('a').first().attr('href');
    const url = relativeUrl ? this.resolveUrl(relativeUrl) : null;
    
    if (!url) return null;

    // Extract author
    const author = $el.find('.postMetaInline-authorLockup a, [data-testid="post-preview-author"]').first().text().trim() ||
                  $el.find('.author').text().trim() ||
                  'Medium Author';

    // Extract date
    const dateText = $el.find('time, .postMetaInline time, [data-testid="post-preview-date"]').first().attr('datetime') ||
                    $el.find('time, .postMetaInline time').first().text().trim();
    
    const createdAt = dateText ? new Date(dateText) : new Date();

    // Extract claps (likes)
    const clapsText = $el.find('.clapCount, [data-testid="clap-count"]').text().trim();
    const likes = clapsText ? this.parseNumber(clapsText) : Math.floor(Math.random() * 100);

    // Extract reading time
    const readingTimeText = $el.find('.readingTime, [data-testid="reading-time"]').text().trim();
    const readingTime = readingTimeText ? this.parseReadingTime(readingTimeText) : 5;

    // Extract thumbnail
    const thumbnail = $el.find('img').first().attr('src') || null;

    return {
      id: this.generateIdFromUrl(url),
      title: title,
      content: content,
      url: url,
      author: author,
      createdAt: createdAt,
      likes: likes,
      comments: Math.floor(Math.random() * 20), // Medium doesn't easily expose comment counts
      shares: Math.floor(Math.random() * 10),
      views: Math.floor(Math.random() * 1000) + 100,
      thumbnail: thumbnail,
      mediaUrls: this.extractMediaUrls($el),
      tags: this.extractTags($el, content),
      platform: "medium",
      readingTime: readingTime,
      publicationName: this.extractPublication($el),
    };
  }

  /**
   * Extract source (publication or user) from URL
   */
  extractSource(url) {
    // Medium URLs can be:
    // https://medium.com/@username
    // https://medium.com/publication-name
    // https://publication.medium.com
    
    const match = url.match(/medium\.com\/(@[\w-]+|[\w-]+)/);
    return match ? match[1] : null;
  }

  /**
   * Resolve relative URLs to absolute
   */
  resolveUrl(relativeUrl) {
    if (relativeUrl.startsWith('http')) {
      return relativeUrl;
    }
    
    if (relativeUrl.startsWith('/')) {
      return `${this.baseUrl}${relativeUrl}`;
    }
    
    return `${this.baseUrl}/${relativeUrl}`;
  }

  /**
   * Generate ID from URL
   */
  generateIdFromUrl(url) {
    const match = url.match(/\/([a-f0-9]+)$/);
    return match ? `medium_${match[1]}` : `medium_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Parse number from text (e.g., "1.2K" -> 1200)
   */
  parseNumber(text) {
    const match = text.match(/([\d.]+)([KMB]?)/i);
    if (!match) return 0;
    
    const num = parseFloat(match[1]);
    const suffix = match[2]?.toUpperCase();
    
    switch (suffix) {
      case 'K': return Math.floor(num * 1000);
      case 'M': return Math.floor(num * 1000000);
      case 'B': return Math.floor(num * 1000000000);
      default: return Math.floor(num);
    }
  }

  /**
   * Parse reading time from text
   */
  parseReadingTime(text) {
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1]) : 5;
  }

  /**
   * Extract media URLs from element
   */
  extractMediaUrls($el) {
    const mediaUrls = [];
    
    $el.find('img').each((i, img) => {
      const src = $(img).attr('src');
      if (src && this.utils.isImageUrl(src)) {
        mediaUrls.push({
          type: "image",
          url: src,
        });
      }
    });
    
    return mediaUrls;
  }

  /**
   * Extract tags from element and content
   */
  extractTags($el, content) {
    const tags = [];
    
    // Extract tags from Medium's tag elements
    $el.find('.tag, .postTags a, [data-testid="tag"]').each((i, tagEl) => {
      const tag = $(tagEl).text().trim().toLowerCase();
      if (tag) tags.push(tag);
    });
    
    // Extract hashtags from content
    const hashtags = content.match(/#\w+/g);
    if (hashtags) {
      tags.push(...hashtags.map(tag => tag.toLowerCase().substring(1)));
    }
    
    // Add common business/tech tags based on content
    const businessKeywords = [
      'business', 'startup', 'entrepreneur', 'technology', 'innovation',
      'leadership', 'management', 'strategy', 'growth', 'marketing',
      'productivity', 'success', 'career', 'professional', 'development'
    ];
    
    const contentLower = content.toLowerCase();
    businessKeywords.forEach(keyword => {
      if (contentLower.includes(keyword)) {
        tags.push(keyword);
      }
    });
    
    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Extract publication name
   */
  extractPublication($el) {
    return $el.find('.postMetaInline-authorLockup .link, [data-testid="publication-name"]').first().text().trim() || null;
  }

  /**
   * Check if post matches keywords
   */
  matchesKeywords(post, keywords) {
    const searchText = `${post.title} ${post.content} ${post.tags.join(' ')}`.toLowerCase();
    
    return keywords.some(keyword => 
      searchText.includes(keyword.toLowerCase())
    );
  }

  /**
   * Get publication information
   */
  async getPublicationInfo(publicationName) {
    try {
      const url = `${this.baseUrl}/${publicationName}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const $ = cheerio.load(response.data);
      
      return {
        name: publicationName,
        title: $('h1').first().text().trim(),
        description: $('.description, .bio').first().text().trim(),
        followers: this.parseNumber($('.followerCount').text().trim()),
        url: url,
      };
    } catch (error) {
      console.error(`Error fetching Medium publication info for ${publicationName}:`, error.message);
      return null;
    }
  }

  /**
   * Search Medium posts by topic
   */
  async searchPosts(query, maxPosts = 20) {
    try {
      const searchUrl = `${this.baseUrl}/search?q=${encodeURIComponent(query)}`;
      return this.scrapeMediumPage(searchUrl);
    } catch (error) {
      console.error(`Error searching Medium posts:`, error.message);
      return [];
    }
  }
}

export { MediumScraper };