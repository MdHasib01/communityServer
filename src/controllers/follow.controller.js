import mongoose, { isValidObjectId } from "mongoose";
import { Follow } from "../models/follow.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleFollow = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const followerId = req.user._id;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  if (followerId.equals(userId)) {
    throw new ApiError(400, "You cannot follow yourself");
  }

  // Check if target user exists
  const targetUser = await User.findById(userId);
  if (!targetUser) {
    throw new ApiError(404, "User not found");
  }

  // Check if already following
  const existingFollow = await Follow.findOne({
    follower: followerId,
    following: userId,
  });

  if (existingFollow) {
    // Unfollow
    await Follow.findByIdAndDelete(existingFollow._id);

    return res
      .status(200)
      .json(new ApiResponse(200, { following: false }, "User unfollowed successfully"));
  } else {
    // Follow
    await Follow.create({
      follower: followerId,
      following: userId,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, { following: true }, "User followed successfully"));
  }
});

const getUserFollowers = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const {
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortType = "desc",
  } = req.query;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  const pipeline = [
    {
      $match: {
        following: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "follower",
        foreignField: "_id",
        as: "follower",
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
        follower: { $first: "$follower" },
      },
    },
  ];

  // Sort
  const sortOrder = sortType === "asc" ? 1 : -1;
  pipeline.push({ $sort: { [sortBy]: sortOrder } });

  const followAggregate = Follow.aggregate(pipeline);
  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const followers = await Follow.aggregatePaginate(followAggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, followers, "Followers fetched successfully"));
});

const getUserFollowing = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const {
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortType = "desc",
  } = req.query;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  const pipeline = [
    {
      $match: {
        follower: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "following",
        foreignField: "_id",
        as: "following",
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
        following: { $first: "$following" },
      },
    },
  ];

  // Sort
  const sortOrder = sortType === "asc" ? 1 : -1;
  pipeline.push({ $sort: { [sortBy]: sortOrder } });

  const followAggregate = Follow.aggregate(pipeline);
  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const following = await Follow.aggregatePaginate(followAggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, following, "Following list fetched successfully"));
});

const getFollowStats = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  const [followersCount, followingCount] = await Promise.all([
    Follow.countDocuments({ following: userId }),
    Follow.countDocuments({ follower: userId }),
  ]);

  const stats = {
    followers: followersCount,
    following: followingCount,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, stats, "Follow stats fetched successfully"));
});

const checkFollowStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const followerId = req.user._id;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  const isFollowing = await Follow.exists({
    follower: followerId,
    following: userId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { isFollowing: !!isFollowing }, "Follow status checked"));
});

export {
  toggleFollow,
  getUserFollowers,
  getUserFollowing,
  getFollowStats,
  checkFollowStatus,
};