import mongoose, { isValidObjectId } from "mongoose";
import { Bookmark } from "../models/bookmark.model.js";
import { Post } from "../models/post.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleBookmark = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { collection = "default" } = req.body;
  const userId = req.user._id;

  if (!isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid post ID");
  }

  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  if (post.status !== "active") {
    throw new ApiError(400, "Cannot bookmark inactive post");
  }

  // Check if already bookmarked in this collection
  const existingBookmark = await Bookmark.findOne({
    user: userId,
    post: postId,
    collection: collection,
  });

  if (existingBookmark) {
    // Remove bookmark
    await Bookmark.findByIdAndDelete(existingBookmark._id);

    // Update post bookmark count
    await Post.findByIdAndUpdate(postId, {
      $inc: { "localEngagement.bookmarks": -1 },
    });

    return res
      .status(200)
      .json(new ApiResponse(200, { bookmarked: false }, "Post unbookmarked successfully"));
  } else {
    // Add bookmark
    await Bookmark.create({
      user: userId,
      post: postId,
      collection: collection,
    });

    // Update post bookmark count
    await Post.findByIdAndUpdate(postId, {
      $inc: { "localEngagement.bookmarks": 1 },
    });

    return res
      .status(200)
      .json(new ApiResponse(200, { bookmarked: true }, "Post bookmarked successfully"));
  }
});

const getUserBookmarks = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const {
    page = 1,
    limit = 10,
    collection,
    sortBy = "createdAt",
    sortType = "desc",
  } = req.query;

  const pipeline = [];

  // Match conditions
  const matchConditions = {
    user: new mongoose.Types.ObjectId(userId),
  };
  
  if (collection) {
    matchConditions.collection = collection;
  }
  
  pipeline.push({ $match: matchConditions });

  // Lookup post details
  pipeline.push(
    {
      $lookup: {
        from: "posts",
        localField: "post",
        foreignField: "_id",
        as: "post",
        pipeline: [
          { $match: { status: "active" } },
          {
            $lookup: {
              from: "communities",
              localField: "community",
              foreignField: "_id",
              as: "community",
              pipeline: [
                {
                  $project: {
                    name: 1,
                    category: 1,
                  },
                },
              ],
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              community: { $first: "$community" },
              owner: { $first: "$owner" },
            },
          },
        ],
      },
    },
    {
      $match: {
        "post.0": { $exists: true }, // Ensure post exists and is active
      },
    },
    {
      $addFields: {
        post: { $first: "$post" },
      },
    }
  );

  // Sort
  const sortOrder = sortType === "asc" ? 1 : -1;
  pipeline.push({ $sort: { [sortBy]: sortOrder } });

  const bookmarkAggregate = Bookmark.aggregate(pipeline);
  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const bookmarks = await Bookmark.aggregatePaginate(bookmarkAggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, bookmarks, "Bookmarks fetched successfully"));
});

const getUserBookmarkCollections = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const collections = await Bookmark.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $group: {
        _id: "$collection",
        count: { $sum: 1 },
        lastUpdated: { $max: "$createdAt" },
      },
    },
    {
      $project: {
        collection: "$_id",
        count: 1,
        lastUpdated: 1,
        _id: 0,
      },
    },
    {
      $sort: { lastUpdated: -1 },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, collections, "Bookmark collections fetched successfully"));
});

const createBookmarkCollection = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const userId = req.user._id;

  if (!name?.trim()) {
    throw new ApiError(400, "Collection name is required");
  }

  const collectionName = name.trim().toLowerCase().replace(/\s+/g, '-');

  // Check if collection already exists for user
  const existingCollection = await Bookmark.findOne({
    user: userId,
    collection: collectionName,
  });

  if (existingCollection) {
    throw new ApiError(400, "Collection with this name already exists");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { collection: collectionName }, "Collection name validated"));
});

const deleteBookmarkCollection = asyncHandler(async (req, res) => {
  const { collection } = req.params;
  const userId = req.user._id;

  if (collection === "default") {
    throw new ApiError(400, "Cannot delete default collection");
  }

  const result = await Bookmark.deleteMany({
    user: userId,
    collection: collection,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { deletedCount: result.deletedCount }, "Collection deleted successfully"));
});

const moveBookmark = asyncHandler(async (req, res) => {
  const { bookmarkId } = req.params;
  const { collection } = req.body;
  const userId = req.user._id;

  if (!collection?.trim()) {
    throw new ApiError(400, "Collection name is required");
  }

  if (!isValidObjectId(bookmarkId)) {
    throw new ApiError(400, "Invalid bookmark ID");
  }

  const bookmark = await Bookmark.findById(bookmarkId);
  if (!bookmark) {
    throw new ApiError(404, "Bookmark not found");
  }

  if (!bookmark.user.equals(userId)) {
    throw new ApiError(403, "You can only move your own bookmarks");
  }

  const updatedBookmark = await Bookmark.findByIdAndUpdate(
    bookmarkId,
    { collection: collection.trim().toLowerCase().replace(/\s+/g, '-') },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedBookmark, "Bookmark moved successfully"));
});

const checkBookmarkStatus = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid post ID");
  }

  const bookmarks = await Bookmark.find({
    user: userId,
    post: postId,
  }).select("collection");

  const collections = bookmarks.map(bookmark => bookmark.collection);

  return res
    .status(200)
    .json(new ApiResponse(200, { 
      isBookmarked: bookmarks.length > 0,
      collections: collections,
    }, "Bookmark status checked"));
});

export {
  toggleBookmark,
  getUserBookmarks,
  getUserBookmarkCollections,
  createBookmarkCollection,
  deleteBookmarkCollection,
  moveBookmark,
  checkBookmarkStatus,
};