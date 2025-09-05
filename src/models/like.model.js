import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema(
  {
    likedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      index: true,
    },
    comment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure a user can only like a post or comment once
likeSchema.index({ likedBy: 1, post: 1 }, { unique: true, sparse: true });
likeSchema.index({ likedBy: 1, comment: 1 }, { unique: true, sparse: true });

// Ensure either post or comment is provided, but not both
likeSchema.pre('save', function(next) {
  if ((this.post && this.comment) || (!this.post && !this.comment)) {
    next(new Error('Either post or comment must be provided, but not both'));
  } else {
    next();
  }
});

export const Like = mongoose.model("Like", likeSchema);