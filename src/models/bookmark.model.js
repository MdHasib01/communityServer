import mongoose, { Schema } from "mongoose";

const bookmarkSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    collection: {
      type: String,
      default: "default",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure a user can only bookmark a post once per collection
bookmarkSchema.index({ user: 1, post: 1, collection: 1 }, { unique: true });

export const Bookmark = mongoose.model("Bookmark", bookmarkSchema);