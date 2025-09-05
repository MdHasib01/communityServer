import { Router } from "express";
import {
  createComment,
  getPostComments,
  getCommentReplies,
  updateComment,
  deleteComment,
  toggleCommentLike,
} from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes
router.route("/post/:postId").get(getPostComments);
router.route("/:commentId/replies").get(getCommentReplies);

// Protected routes (require authentication)
router.use(verifyJWT);
router.route("/").post(createComment);
router.route("/:commentId").patch(updateComment).delete(deleteComment);
router.route("/:commentId/like").post(toggleCommentLike);

export default router;