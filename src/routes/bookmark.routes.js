import { Router } from "express";
import {
  toggleBookmark,
  getUserBookmarks,
  getUserBookmarkCollections,
  createBookmarkCollection,
  deleteBookmarkCollection,
  moveBookmark,
  checkBookmarkStatus,
} from "../controllers/bookmark.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// All bookmark routes require authentication
router.use(verifyJWT);

router.route("/post/:postId").post(toggleBookmark);
router.route("/post/:postId/status").get(checkBookmarkStatus);
router.route("/").get(getUserBookmarks);
router.route("/collections").get(getUserBookmarkCollections).post(createBookmarkCollection);
router.route("/collections/:collection").delete(deleteBookmarkCollection);
router.route("/:bookmarkId/move").patch(moveBookmark);

export default router;