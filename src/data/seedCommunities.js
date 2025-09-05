import { Community } from "../models/community.model.js";

const communitiesData = [
  {
    name: "Entrepreneurs Hub",
    description: "A community for entrepreneurs to share insights, experiences, and connect with like-minded individuals.",
    category: "entrepreneurs",
    scrapingPlatforms: [
      {
        platform: "reddit",
        sourceUrl: "https://www.reddit.com/r/entrepreneur",
        keywords: ["startup", "business", "entrepreneur", "funding", "growth"],
        isActive: true,
      },
      {
        platform: "twitter",
        sourceUrl: "https://twitter.com/search?q=entrepreneur",
        keywords: ["entrepreneur", "startup", "business", "founder"],
        isActive: true,
      },
    ],
    scrapingConfig: {
      frequency: "daily",
      maxPostsPerScrape: 25,
      qualityThreshold: 0.6,
    },
  },
  {
    name: "Startup Central",
    description: "Everything about startups - from ideation to scaling, funding to exit strategies.",
    category: "startups",
    scrapingPlatforms: [
      {
        platform: "reddit",
        sourceUrl: "https://www.reddit.com/r/startups",
        keywords: ["startup", "mvp", "funding", "venture capital", "seed"],
        isActive: true,
      },
      {
        platform: "medium",
        sourceUrl: "https://medium.com/topic/startup",
        keywords: ["startup", "entrepreneurship", "venture", "scaling"],
        isActive: true,
      },
    ],
    scrapingConfig: {
      frequency: "daily",
      maxPostsPerScrape: 30,
      qualityThreshold: 0.7,
    },
  },
  {
    name: "Small Business Network",
    description: "Supporting small business owners with practical advice, resources, and community support.",
    category: "small-business",
    scrapingPlatforms: [
      {
        platform: "reddit",
        sourceUrl: "https://www.reddit.com/r/smallbusiness",
        keywords: ["small business", "local business", "operations", "customers"],
        isActive: true,
      },
      {
        platform: "linkedin",
        sourceUrl: "https://linkedin.com/company/small-business",
        keywords: ["small business", "local", "community", "growth"],
        isActive: true,
      },
    ],
    scrapingConfig: {
      frequency: "daily",
      maxPostsPerScrape: 20,
      qualityThreshold: 0.5,
    },
  },
  {
    name: "Business Strategy Forum",
    description: "Discussing business strategies, market analysis, and corporate decision-making.",
    category: "business-general",
    scrapingPlatforms: [
      {
        platform: "linkedin",
        sourceUrl: "https://linkedin.com/company/business-strategy",
        keywords: ["strategy", "business", "market", "analysis", "corporate"],
        isActive: true,
      },
      {
        platform: "medium",
        sourceUrl: "https://medium.com/topic/business",
        keywords: ["business strategy", "corporate", "management", "leadership"],
        isActive: true,
      },
    ],
    scrapingConfig: {
      frequency: "daily",
      maxPostsPerScrape: 25,
      qualityThreshold: 0.6,
    },
  },
  {
    name: "Marketing Masters",
    description: "Digital marketing strategies, campaigns, and growth hacking techniques.",
    category: "marketing",
    scrapingPlatforms: [
      {
        platform: "reddit",
        sourceUrl: "https://www.reddit.com/r/marketing",
        keywords: ["marketing", "digital marketing", "seo", "social media", "advertising"],
        isActive: true,
      },
      {
        platform: "twitter",
        sourceUrl: "https://twitter.com/search?q=marketing",
        keywords: ["marketing", "digital", "seo", "content", "social"],
        isActive: true,
      },
    ],
    scrapingConfig: {
      frequency: "daily",
      maxPostsPerScrape: 35,
      qualityThreshold: 0.5,
    },
  },
  {
    name: "SaaS Builders",
    description: "Community for SaaS entrepreneurs, developers, and business owners.",
    category: "saas-owners",
    scrapingPlatforms: [
      {
        platform: "reddit",
        sourceUrl: "https://www.reddit.com/r/SaaS",
        keywords: ["saas", "software", "subscription", "recurring revenue", "b2b"],
        isActive: true,
      },
      {
        platform: "twitter",
        sourceUrl: "https://twitter.com/search?q=saas",
        keywords: ["saas", "software", "subscription", "mrr", "arr"],
        isActive: true,
      },
    ],
    scrapingConfig: {
      frequency: "daily",
      maxPostsPerScrape: 20,
      qualityThreshold: 0.7,
    },
  },
  {
    name: "E-commerce Excellence",
    description: "Online retail strategies, e-commerce platforms, and digital commerce trends.",
    category: "e-commerce",
    scrapingPlatforms: [
      {
        platform: "reddit",
        sourceUrl: "https://www.reddit.com/r/ecommerce",
        keywords: ["ecommerce", "online store", "shopify", "amazon", "retail"],
        isActive: true,
      },
      {
        platform: "medium",
        sourceUrl: "https://medium.com/topic/ecommerce",
        keywords: ["ecommerce", "online retail", "digital commerce", "marketplace"],
        isActive: true,
      },
    ],
    scrapingConfig: {
      frequency: "daily",
      maxPostsPerScrape: 25,
      qualityThreshold: 0.6,
    },
  },
  {
    name: "Sales Professionals",
    description: "Sales techniques, customer relationship management, and revenue growth strategies.",
    category: "sales",
    scrapingPlatforms: [
      {
        platform: "reddit",
        sourceUrl: "https://www.reddit.com/r/sales",
        keywords: ["sales", "selling", "crm", "leads", "conversion"],
        isActive: true,
      },
      {
        platform: "linkedin",
        sourceUrl: "https://linkedin.com/company/sales",
        keywords: ["sales", "b2b", "selling", "revenue", "customers"],
        isActive: true,
      },
    ],
    scrapingConfig: {
      frequency: "daily",
      maxPostsPerScrape: 20,
      qualityThreshold: 0.5,
    },
  },
  {
    name: "Personal Finance Hub",
    description: "Personal finance advice, investment strategies, and wealth building tips.",
    category: "personal-finance",
    scrapingPlatforms: [
      {
        platform: "reddit",
        sourceUrl: "https://www.reddit.com/r/personalfinance",
        keywords: ["personal finance", "investing", "budgeting", "savings", "retirement"],
        isActive: true,
      },
      {
        platform: "medium",
        sourceUrl: "https://medium.com/topic/personal-finance",
        keywords: ["finance", "investing", "money", "wealth", "financial"],
        isActive: true,
      },
    ],
    scrapingConfig: {
      frequency: "daily",
      maxPostsPerScrape: 30,
      qualityThreshold: 0.6,
    },
  },
  {
    name: "Business Ideas Lab",
    description: "Innovative business ideas, market opportunities, and entrepreneurial inspiration.",
    category: "business-ideas",
    scrapingPlatforms: [
      {
        platform: "reddit",
        sourceUrl: "https://www.reddit.com/r/businessideas",
        keywords: ["business ideas", "opportunity", "innovation", "market gap", "startup idea"],
        isActive: true,
      },
      {
        platform: "twitter",
        sourceUrl: "https://twitter.com/search?q=business%20ideas",
        keywords: ["business ideas", "opportunity", "innovation", "startup"],
        isActive: true,
      },
    ],
    scrapingConfig: {
      frequency: "daily",
      maxPostsPerScrape: 15,
      qualityThreshold: 0.5,
    },
  },
];

export async function seedCommunities() {
  try {
    console.log("Seeding communities...");
    
    // Check if communities already exist
    const existingCount = await Community.countDocuments();
    if (existingCount > 0) {
      console.log(`Communities already exist (${existingCount} found). Skipping seed.`);
      return;
    }
    
    // Insert communities
    const createdCommunities = await Community.insertMany(communitiesData);
    console.log(`✅ Successfully seeded ${createdCommunities.length} communities`);
    
    return createdCommunities;
  } catch (error) {
    console.error("❌ Error seeding communities:", error);
    throw error;
  }
}

export { communitiesData };