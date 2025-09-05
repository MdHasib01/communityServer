import mongoose, { Schema } from "mongoose";

const followSchema = new Schema(
  {
    follower: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    following: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure a user can't follow the same person twice
followSchema.index({ follower: 1, following: 1 }, { unique: true });

// Prevent self-following
followSchema.pre('save', function(next) {
  if (this.follower.equals(this.following)) {
    next(new Error('Users cannot follow themselves'));
  } else {
    next();
  }
});

export const Follow = mongoose.model("Follow", followSchema);