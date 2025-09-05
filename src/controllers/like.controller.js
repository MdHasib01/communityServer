import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { Post } from "../models/post.model.js";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const togglePostLike = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid post ID");
  }

  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  if (post.status !== "active") {
    throw new ApiError(400, "Cannot like inactive post");
  }

  // Check if user already liked this post
  const existingLike = await Like.findOne({
    likedBy: userId,
    post: postId,
  });

  if (existingLike) {
    // Unlike
    await Like.findByIdAndDelete(existingLike._id);
    await Post.findByIdAndUpdate(postId, {
      $inc: { "localEngagement.likes": -1 },
    });

    return res
      .status(200)
      .json(new ApiResponse(200, { liked: false }, "Post unliked successfully"));
  } else {
    // Like
    await Like.create({
      likedBy: userId,
      post: postId,
    });
    await Post.findByIdAndUpdate(postId, {
      $inc: { "localEngagement.likes": 1 },
    });

    return res
      .status(200)
      .json(new ApiResponse(200, { liked: true }, "Post liked successfully"));
  }
});

const getUserLikedPosts = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const {
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortType = "desc",
  } = req.query;

  const pipeline = [
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(userId),
        post: { $exists: true },
      },
    },
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
    },
  ];

  // Sort
  const sortOrder = sortType === "asc" ? 1 : -1;
  pipeline.push({ $sort: { [sortBy]: sortOrder } });

  const likeAggregate = Like.aggregate(pipeline);
  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const likedPosts = await Like.aggregatePaginate(likeAggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, likedPosts, "Liked posts fetched successfully"));
});

const getPostLikes = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const {
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortType = "desc",
  } = req.query;

  if (!isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid post ID");
  }

  const pipeline = [
    {
      $match: {
        post: new mongoose.Types.ObjectId(postId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "likedBy",
        foreignField: "_id",
        as: "user",
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
        user: { $first: "$user" },
      },
    },
  ];

  // Sort
  const sortOrder = sortType === "asc" ? 1 : -1;
  pipeline.push({ $sort: { [sortBy]: sortOrder } });

  const likeAggregate = Like.aggregate(pipeline);
  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const likes = await Like.aggregatePaginate(likeAggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, likes, "Post likes fetched successfully"));
});

export {
  togglePostLike,
  getUserLikedPosts,
  getPostLikes,
};