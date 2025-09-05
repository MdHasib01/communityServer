import { Router } from "express";
import {
  toggleFollow,
  getUserFollowers,
  getUserFollowing,
  getFollowStats,
  checkFollowStatus,
} from "../controllers/follow.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes
router.route("/user/:userId/followers").get(getUserFollowers);
router.route("/user/:userId/following").get(getUserFollowing);
router.route("/user/:userId/stats").get(getFollowStats);

// Protected routes (require authentication)
router.use(verifyJWT);
router.route("/user/:userId").post(toggleFollow);
router.route("/user/:userId/status").get(checkFollowStatus);

export default router;