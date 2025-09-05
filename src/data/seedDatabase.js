import { seedUsers } from "./seedUsers.js";
import { seedCommunities } from "./seedCommunities.js";

export async function seedDatabase() {
  try {
    console.log("🌱 Starting database seeding...");
    
    // Seed users first (needed for post ownership)
    await seedUsers();
    
    // Seed communities
    await seedCommunities();
    
    console.log("✅ Database seeding completed successfully!");
    
    return {
      success: true,
      message: "Database seeded successfully",
    };
  } catch (error) {
    console.error("❌ Database seeding failed:", error);
    throw error;
  }
}