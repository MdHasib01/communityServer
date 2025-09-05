import { Router } from "express";
import {
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
  togglePostLike,
  getPostsByPlatform,
  getPostStats,
} from "../controllers/post.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes
router.route("/").get(getAllPosts);
router.route("/stats").get(getPostStats);
router.route("/platform/:platform").get(getPostsByPlatform);
router.route("/:postId").get(getPostById);

// Protected routes (require authentication)
router.use(verifyJWT);
router.route("/:postId").patch(updatePost).delete(deletePost);
router.route("/:postId/like").post(togglePostLike);

export default router;