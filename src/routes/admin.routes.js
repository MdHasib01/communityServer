import { Router } from "express";
import { seedDatabase } from "../data/seedDatabase.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// All admin routes require authentication
router.use(verifyJWT);

/**
 * Seed the database with initial data
 */
router.post("/seed", asyncHandler(async (req, res) => {
  try {
    const result = await seedDatabase();
    
    return res
      .status(200)
      .json(new ApiResponse(200, result, "Database seeded successfully"));
  } catch (error) {
    throw new ApiError(500, `Database seeding failed: ${error.message}`);
  }
}));

/**
 * Get system statistics
 */
router.get("/stats", asyncHandler(async (req, res) => {
  try {
    // Import models dynamically to avoid circular dependencies
    const { User } = await import("../models/user.model.js");
    const { Community } = await import("../models/community.model.js");
    const { Post } = await import("../models/post.model.js");
    
    const [userCount, communityCount, postCount, activePostCount] = await Promise.all([
      User.countDocuments(),
      Community.countDocuments(),
      Post.countDocuments(),
      Post.countDocuments({ status: "active" }),
    ]);
    
    const stats = {
      users: userCount,
      communities: communityCount,
      totalPosts: postCount,
      activePosts: activePostCount,
      timestamp: new Date(),
    };
    
    return res
      .status(200)
      .json(new ApiResponse(200, stats, "System stats fetched successfully"));
  } catch (error) {
    throw new ApiError(500, `Failed to fetch system stats: ${error.message}`);
  }
}));

export default router;