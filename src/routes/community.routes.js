import { Router } from "express";
import {
  createCommunity,
  getAllCommunities,
  getCommunityById,
  updateCommunity,
  deleteCommunity,
  getCommunityPosts,
  getCommunityStats,
} from "../controllers/community.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes
router.route("/").get(getAllCommunities);
router.route("/:communityId").get(getCommunityById);
router.route("/:communityId/posts").get(getCommunityPosts);
router.route("/:communityId/stats").get(getCommunityStats);

// Protected routes (require authentication)
router.use(verifyJWT);
router.route("/").post(createCommunity);
router.route("/:communityId").patch(updateCommunity).delete(deleteCommunity);

export default router;