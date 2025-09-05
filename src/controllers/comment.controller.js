import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Post } from "../models/post.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createComment = asyncHandler(async (req, res) => {
  const { content, postId, parentCommentId } = req.body;
  const userId = req.user._id;

  if (!content?.trim()) {
    throw new ApiError(400, "Comment content is required");
  }

  if (!isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid post ID");
  }

  // Verify post exists
  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  // Verify parent comment exists if provided
  if (parentCommentId) {
    if (!isValidObjectId(parentCommentId)) {
      throw new ApiError(400, "Invalid parent comment ID");
    }
    
    const parentComment = await Comment.findById(parentCommentId);
    if (!parentComment) {
      throw new ApiError(404, "Parent comment not found");
    }
    
    if (!parentComment.post.equals(postId)) {
      throw new ApiError(400, "Parent comment does not belong to this post");
    }
  }

  const comment = await Comment.create({
    content: content.trim(),
    post: postId,
    owner: userId,
    parentComment: parentCommentId || null,
  });

  // Update post comment count
  await Post.findByIdAndUpdate(postId, {
    $inc: { "localEngagement.comments": 1 },
  });

  const populatedComment = await Comment.findById(comment._id).populate([
    {
      path: "owner",
      select: "username fullName avatar",
    },
    {
      path: "parentComment",
      select: "content owner",
      populate: {
        path: "owner",
        select: "username fullName",
      },
    },
  ]);

  return res
    .status(201)
    .json(new ApiResponse(201, populatedComment, "Comment created successfully"));
});

const getPostComments = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const {
    page = 1,
    limit = 10,
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
        parentComment: null, // Only top-level comments
        isDeleted: false,
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
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "parentComment",
        as: "replies",
        pipeline: [
          { $match: { isDeleted: false } },
          { $sort: { createdAt: 1 } },
          { $limit: 3 }, // Show only first 3 replies
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
        owner: { $first: "$owner" },
        replyCount: {
          $size: {
            $filter: {
              input: "$replies",
              cond: { $eq: ["$$this.isDeleted", false] },
            },
          },
        },
      },
    },
  ];

  // Sort
  const sortOrder = sortType === "asc" ? 1 : -1;
  pipeline.push({ $sort: { [sortBy]: sortOrder } });

  const commentAggregate = Comment.aggregate(pipeline);
  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const comments = await Comment.aggregatePaginate(commentAggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

const getCommentReplies = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const {
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortType = "asc",
  } = req.query;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  const pipeline = [
    {
      $match: {
        parentComment: new mongoose.Types.ObjectId(commentId),
        isDeleted: false,
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
        owner: { $first: "$owner" },
      },
    },
  ];

  // Sort
  const sortOrder = sortType === "asc" ? 1 : -1;
  pipeline.push({ $sort: { [sortBy]: sortOrder } });

  const replyAggregate = Comment.aggregate(pipeline);
  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const replies = await Comment.aggregatePaginate(replyAggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, replies, "Comment replies fetched successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;
  const userId = req.user._id;

  if (!content?.trim()) {
    throw new ApiError(400, "Comment content is required");
  }

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  if (!comment.owner.equals(userId)) {
    throw new ApiError(403, "You can only edit your own comments");
  }

  if (comment.isDeleted) {
    throw new ApiError(400, "Cannot edit deleted comment");
  }

  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    {
      content: content.trim(),
      isEdited: true,
    },
    { new: true }
  ).populate([
    {
      path: "owner",
      select: "username fullName avatar",
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  if (!comment.owner.equals(userId)) {
    throw new ApiError(403, "You can only delete your own comments");
  }

  // Soft delete
  await Comment.findByIdAndUpdate(commentId, { isDeleted: true });

  // Update post comment count
  await Post.findByIdAndUpdate(comment.post, {
    $inc: { "localEngagement.comments": -1 },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted successfully"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  if (comment.isDeleted) {
    throw new ApiError(400, "Cannot like deleted comment");
  }

  // Check if user already liked this comment
  const existingLike = await Like.findOne({
    likedBy: userId,
    comment: commentId,
  });

  if (existingLike) {
    // Unlike
    await Like.findByIdAndDelete(existingLike._id);
    await Comment.findByIdAndUpdate(commentId, {
      $inc: { likes: -1 },
    });

    return res
      .status(200)
      .json(new ApiResponse(200, { liked: false }, "Comment unliked successfully"));
  } else {
    // Like
    await Like.create({
      likedBy: userId,
      comment: commentId,
    });
    await Comment.findByIdAndUpdate(commentId, {
      $inc: { likes: 1 },
    });

    return res
      .status(200)
      .json(new ApiResponse(200, { liked: true }, "Comment liked successfully"));
  }
});

export {
  createComment,
  getPostComments,
  getCommentReplies,
  updateComment,
  deleteComment,
  toggleCommentLike,
};