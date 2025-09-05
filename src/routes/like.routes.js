import { Router } from "express";
import {
  togglePostLike,
  getUserLikedPosts,
  getPostLikes,
} from "../controllers/like.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes
router.route("/post/:postId/users").get(getPostLikes);

// Protected routes (require authentication)
router.use(verifyJWT);
router.route("/post/:postId").post(togglePostLike);
router.route("/user/posts").get(getUserLikedPosts);

export default router;