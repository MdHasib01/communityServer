class ScrapingUtils {
  /**
   * Delay execution for specified milliseconds
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if URL is an image
   */
  isImageUrl(url) {
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i;
    return imageExtensions.test(url);
  }

  /**
   * Check if URL is a video
   */
  isVideoUrl(url) {
    const videoExtensions = /\.(mp4|webm|ogg|avi|mov|wmv|flv|m4v)(\?.*)?$/i;
    const videoHosts = /(?:youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|twitch\.tv)/i;
    return videoExtensions.test(url) || videoHosts.test(url);
  }

  /**
   * Clean and normalize text content
   */
  cleanText(text) {
    if (!text) return '';
    
    return text
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/[\r\n\t]/g, ' ') // Replace line breaks and tabs with space
      .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '') // Remove non-printable characters
      .trim();
  }

  /**
   * Extract domain from URL
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate URL format
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate random user agent
   */
  getRandomUserAgent() {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    ];
    
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  /**
   * Retry function with exponential backoff
   */
  async retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries - 1) {
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await this.delay(delay);
      }
    }
    
    throw lastError;
  }

  /**
   * Parse relative date strings (e.g., "2 hours ago", "3 days ago")
   */
  parseRelativeDate(dateString) {
    const now = new Date();
    const lowerStr = dateString.toLowerCase();
    
    // Handle "just now", "now"
    if (lowerStr.includes('now') || lowerStr.includes('just')) {
      return now;
    }
    
    // Extract number and unit
    const match = lowerStr.match(/(\d+)\s*(second|minute|hour|day|week|month|year)s?\s*ago/);
    if (!match) {
      return now; // Default to now if can't parse
    }
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    const date = new Date(now);
    
    switch (unit) {
      case 'second':
        date.setSeconds(date.getSeconds() - value);
        break;
      case 'minute':
        date.setMinutes(date.getMinutes() - value);
        break;
      case 'hour':
        date.setHours(date.getHours() - value);
        break;
      case 'day':
        date.setDate(date.getDate() - value);
        break;
      case 'week':
        date.setDate(date.getDate() - (value * 7));
        break;
      case 'month':
        date.setMonth(date.getMonth() - value);
        break;
      case 'year':
        date.setFullYear(date.getFullYear() - value);
        break;
    }
    
    return date;
  }

  /**
   * Truncate text to specified length
   */
  truncateText(text, maxLength = 200, suffix = '...') {
    if (!text || text.length <= maxLength) {
      return text;
    }
    
    return text.substring(0, maxLength - suffix.length) + suffix;
  }

  /**
   * Remove HTML tags from text
   */
  stripHtml(html) {
    if (!html) return '';
    
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  /**
   * Extract hashtags from text
   */
  extractHashtags(text) {
    if (!text) return [];
    
    const hashtags = text.match(/#\w+/g);
    return hashtags ? hashtags.map(tag => tag.toLowerCase().substring(1)) : [];
  }

  /**
   * Extract mentions from text
   */
  extractMentions(text) {
    if (!text) return [];
    
    const mentions = text.match(/@\w+/g);
    return mentions ? mentions.map(mention => mention.toLowerCase().substring(1)) : [];
  }

  /**
   * Extract URLs from text
   */
  extractUrls(text) {
    if (!text) return [];
    
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex);
    return urls || [];
  }

  /**
   * Calculate text similarity (simple Jaccard similarity)
   */
  calculateSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Generate unique ID
   */
  generateId(prefix = '') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}${timestamp}_${random}`;
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Format number with K, M, B suffixes
   */
  formatNumber(num) {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + 'B';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  /**
   * Check if content is likely spam
   */
  isLikelySpam(content) {
    if (!content) return false;
    
    const spamIndicators = [
      /buy now/gi,
      /click here/gi,
      /free money/gi,
      /guaranteed/gi,
      /limited time/gi,
      /act now/gi,
      /urgent/gi,
      /winner/gi,
      /congratulations/gi,
      /\$\$\$/g,
      /!!!{3,}/g,
    ];
    
    const spamScore = spamIndicators.reduce((score, pattern) => {
      return score + (pattern.test(content) ? 1 : 0);
    }, 0);
    
    // Consider spam if multiple indicators are present
    return spamScore >= 2;
  }

  /**
   * Rate limiter utility
   */
  createRateLimiter(requestsPerSecond = 1) {
    let lastRequestTime = 0;
    const interval = 1000 / requestsPerSecond;
    
    return async () => {
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;
      
      if (timeSinceLastRequest < interval) {
        await this.delay(interval - timeSinceLastRequest);
      }
      
      lastRequestTime = Date.now();
    };
  }
}

export { ScrapingUtils };