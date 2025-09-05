import mongoose, { isValidObjectId } from "mongoose";
import { Post } from "../models/post.model.js";
import { Community } from "../models/community.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getAllPosts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    community,
    platform,
    sortBy = "createdAt",
    sortType = "desc",
    search,
    minQualityScore = 0,
  } = req.query;

  const pipeline = [];

  // Build match conditions
  const matchConditions = { status: "active" };
  
  if (community && isValidObjectId(community)) {
    matchConditions.community = new mongoose.Types.ObjectId(community);
  }
  
  if (platform) {
    matchConditions.platform = platform;
  }
  
  if (minQualityScore > 0) {
    matchConditions["scrapingMetadata.qualityScore"] = { 
      $gte: parseFloat(minQualityScore) 
    };
  }

  pipeline.push({ $match: matchConditions });

  // Add search functionality
  if (search) {
    pipeline.push({
      $match: {
        $or: [
          { title: { $regex: search, $options: "i" } },
          { content: { $regex: search, $options: "i" } },
          { "scrapingMetadata.tags": { $in: [new RegExp(search, "i")] } },
        ],
      },
    });
  }

  // Lookup community and owner details
  pipeline.push(
    {
      $lookup: {
        from: "communities",
        localField: "community",
        foreignField: "_id",
        as: "communityDetails",
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
        as: "ownerDetails",
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
        community: { $first: "$communityDetails" },
        owner: { $first: "$ownerDetails" },
        totalEngagement: {
          $add: [
            "$localEngagement.likes",
            "$localEngagement.comments",
            "$localEngagement.bookmarks",
          ],
        },
      },
    },
    {
      $project: {
        communityDetails: 0,
        ownerDetails: 0,
      },
    }
  );

  // Sort
  const sortOrder = sortType === "asc" ? 1 : -1;
  pipeline.push({ $sort: { [sortBy]: sortOrder } });

  const postAggregate = Post.aggregate(pipeline);
  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const posts = await Post.aggregatePaginate(postAggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, posts, "Posts fetched successfully"));
});

const getPostById = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid post ID");
  }

  const post = await Post.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(postId),
        status: "active",
      },
    },
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
              description: 1,
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
        totalEngagement: {
          $add: [
            "$localEngagement.likes",
            "$localEngagement.comments",
            "$localEngagement.bookmarks",
          ],
        },
      },
    },
  ]);

  if (!post.length) {
    throw new ApiError(404, "Post not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, post[0], "Post fetched successfully"));
});

const updatePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { title, content, status, isPromoted } = req.body;

  if (!isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid post ID");
  }

  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  // Only allow certain fields to be updated
  const updateData = {};
  if (title) updateData.title = title;
  if (content) updateData.content = content;
  if (status) updateData.status = status;
  if (typeof isPromoted === "boolean") updateData.isPromoted = isPromoted;

  const updatedPost = await Post.findByIdAndUpdate(
    postId,
    { $set: updateData },
    { new: true, runValidators: true }
  ).populate([
    {
      path: "community",
      select: "name category",
    },
    {
      path: "owner",
      select: "username fullName avatar",
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, updatedPost, "Post updated successfully"));
});

const deletePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid post ID");
  }

  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  // Soft delete - mark as deleted instead of removing
  await Post.findByIdAndUpdate(postId, { status: "deleted" });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Post deleted successfully"));
});

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

  // For now, just increment the like count
  // In a full implementation, you'd track individual user likes
  const updatedPost = await Post.findByIdAndUpdate(
    postId,
    { $inc: { "localEngagement.likes": 1 } },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedPost, "Post liked successfully"));
});

const getPostsByPlatform = asyncHandler(async (req, res) => {
  const { platform } = req.params;
  const {
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortType = "desc",
  } = req.query;

  const validPlatforms = ["reddit", "twitter", "linkedin", "medium"];
  if (!validPlatforms.includes(platform)) {
    throw new ApiError(400, "Invalid platform");
  }

  const pipeline = [
    {
      $match: {
        platform: platform,
        status: "active",
      },
    },
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
  ];

  // Sort
  const sortOrder = sortType === "asc" ? 1 : -1;
  pipeline.push({ $sort: { [sortBy]: sortOrder } });

  const postAggregate = Post.aggregate(pipeline);
  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const posts = await Post.aggregatePaginate(postAggregate, options);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        posts,
        `Posts from ${platform} fetched successfully`
      )
    );
});

const getPostStats = asyncHandler(async (req, res) => {
  const stats = await Post.aggregate([
    {
      $match: { status: "active" },
    },
    {
      $group: {
        _id: null,
        totalPosts: { $sum: 1 },
        platformBreakdown: {
          $push: "$platform",
        },
        avgQualityScore: {
          $avg: "$scrapingMetadata.qualityScore",
        },
        totalEngagement: {
          $sum: {
            $add: [
              "$localEngagement.likes",
              "$localEngagement.comments",
              "$localEngagement.bookmarks",
            ],
          },
        },
      },
    },
    {
      $addFields: {
        platformStats: {
          $reduce: {
            input: "$platformBreakdown",
            initialValue: {},
            in: {
              $mergeObjects: [
                "$$value",
                {
                  $arrayToObject: [
                    [
                      {
                        k: "$$this",
                        v: {
                          $add: [
                            {
                              $ifNull: [
                                { $getField: { field: "$$this", input: "$$value" } },
                                0,
                              ],
                            },
                            1,
                          ],
                        },
                      },
                    ],
                  ],
                },
              ],
            },
          },
        },
      },
    },
    {
      $project: {
        platformBreakdown: 0,
      },
    },
  ]);

  const result = stats.length > 0 ? stats[0] : {
    totalPosts: 0,
    platformStats: {},
    avgQualityScore: 0,
    totalEngagement: 0,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Post stats fetched successfully"));
});

export {
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
  togglePostLike,
  getPostsByPlatform,
  getPostStats,
};