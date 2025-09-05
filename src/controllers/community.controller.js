import mongoose, { isValidObjectId } from "mongoose";
import { Community } from "../models/community.model.js";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createCommunity = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    category,
    scrapingPlatforms,
    scrapingConfig,
  } = req.body;

  if (!name || !description || !category) {
    throw new ApiError(400, "Name, description, and category are required");
  }

  const existingCommunity = await Community.findOne({ name });
  if (existingCommunity) {
    throw new ApiError(409, "Community with this name already exists");
  }

  const community = await Community.create({
    name,
    description,
    category,
    scrapingPlatforms: scrapingPlatforms || [],
    scrapingConfig: scrapingConfig || {},
  });

  return res
    .status(201)
    .json(new ApiResponse(201, community, "Community created successfully"));
});

const getAllCommunities = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    category,
    isActive = true,
    sortBy = "createdAt",
    sortType = "desc",
  } = req.query;

  const pipeline = [];

  // Match filters
  const matchConditions = { isActive: isActive === "true" };
  if (category) {
    matchConditions.category = category;
  }
  pipeline.push({ $match: matchConditions });

  // Add post count and member count aggregation
  pipeline.push(
    {
      $lookup: {
        from: "posts",
        localField: "_id",
        foreignField: "community",
        as: "posts",
        pipeline: [{ $match: { status: "active" } }],
      },
    },
    {
      $addFields: {
        actualPostCount: { $size: "$posts" },
      },
    },
    {
      $project: {
        posts: 0, // Remove the posts array to reduce payload size
      },
    }
  );

  // Sort
  const sortOrder = sortType === "asc" ? 1 : -1;
  pipeline.push({ $sort: { [sortBy]: sortOrder } });

  const communityAggregate = Community.aggregate(pipeline);
  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const communities = await Community.aggregatePaginate(
    communityAggregate,
    options
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, communities, "Communities fetched successfully")
    );
});

const getCommunityById = asyncHandler(async (req, res) => {
  const { communityId } = req.params;

  if (!isValidObjectId(communityId)) {
    throw new ApiError(400, "Invalid community ID");
  }

  const community = await Community.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(communityId),
      },
    },
    {
      $lookup: {
        from: "posts",
        localField: "_id",
        foreignField: "community",
        as: "recentPosts",
        pipeline: [
          { $match: { status: "active" } },
          { $sort: { createdAt: -1 } },
          { $limit: 5 },
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
              owner: { $first: "$owner" },
            },
          },
        ],
      },
    },
    {
      $addFields: {
        actualPostCount: {
          $size: {
            $filter: {
              input: "$recentPosts",
              cond: { $eq: ["$$this.status", "active"] },
            },
          },
        },
      },
    },
  ]);

  if (!community.length) {
    throw new ApiError(404, "Community not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, community[0], "Community fetched successfully")
    );
});

const updateCommunity = asyncHandler(async (req, res) => {
  const { communityId } = req.params;
  const updateData = req.body;

  if (!isValidObjectId(communityId)) {
    throw new ApiError(400, "Invalid community ID");
  }

  const community = await Community.findById(communityId);
  if (!community) {
    throw new ApiError(404, "Community not found");
  }

  const updatedCommunity = await Community.findByIdAndUpdate(
    communityId,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedCommunity, "Community updated successfully")
    );
});

const deleteCommunity = asyncHandler(async (req, res) => {
  const { communityId } = req.params;

  if (!isValidObjectId(communityId)) {
    throw new ApiError(400, "Invalid community ID");
  }

  const community = await Community.findById(communityId);
  if (!community) {
    throw new ApiError(404, "Community not found");
  }

  // Soft delete - mark as inactive instead of deleting
  await Community.findByIdAndUpdate(communityId, { isActive: false });

  // Also mark all posts in this community as hidden
  await Post.updateMany(
    { community: communityId },
    { status: "hidden" }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Community deleted successfully"));
});

const getCommunityPosts = asyncHandler(async (req, res) => {
  const { communityId } = req.params;
  const {
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortType = "desc",
    platform,
  } = req.query;

  if (!isValidObjectId(communityId)) {
    throw new ApiError(400, "Invalid community ID");
  }

  const pipeline = [];

  // Match community and active posts
  const matchConditions = {
    community: new mongoose.Types.ObjectId(communityId),
    status: "active",
  };
  if (platform) {
    matchConditions.platform = platform;
  }
  pipeline.push({ $match: matchConditions });

  // Lookup owner details
  pipeline.push(
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
        owner: { $first: "$owner" },
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
    .json(new ApiResponse(200, posts, "Community posts fetched successfully"));
});

const getCommunityStats = asyncHandler(async (req, res) => {
  const { communityId } = req.params;

  if (!isValidObjectId(communityId)) {
    throw new ApiError(400, "Invalid community ID");
  }

  const stats = await Community.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(communityId),
      },
    },
    {
      $lookup: {
        from: "posts",
        localField: "_id",
        foreignField: "community",
        as: "posts",
      },
    },
    {
      $addFields: {
        totalPosts: { $size: "$posts" },
        activePosts: {
          $size: {
            $filter: {
              input: "$posts",
              cond: { $eq: ["$$this.status", "active"] },
            },
          },
        },
        totalEngagement: {
          $sum: {
            $map: {
              input: "$posts",
              as: "post",
              in: {
                $add: [
                  "$$post.localEngagement.likes",
                  "$$post.localEngagement.comments",
                  "$$post.localEngagement.bookmarks",
                ],
              },
            },
          },
        },
        platformBreakdown: {
          $reduce: {
            input: "$posts",
            initialValue: {},
            in: {
              $mergeObjects: [
                "$$value",
                {
                  $arrayToObject: [
                    [
                      {
                        k: "$$this.platform",
                        v: {
                          $add: [
                            {
                              $ifNull: [
                                {
                                  $getField: {
                                    field: "$$this.platform",
                                    input: "$$value",
                                  },
                                },
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
        name: 1,
        category: 1,
        totalPosts: 1,
        activePosts: 1,
        totalEngagement: 1,
        platformBreakdown: 1,
        lastScrapedAt: 1,
        scrapingConfig: 1,
      },
    },
  ]);

  if (!stats.length) {
    throw new ApiError(404, "Community not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, stats[0], "Community stats fetched successfully")
    );
});

export {
  createCommunity,
  getAllCommunities,
  getCommunityById,
  updateCommunity,
  deleteCommunity,
  getCommunityPosts,
  getCommunityStats,
};