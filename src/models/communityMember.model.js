import mongoose, { Schema } from "mongoose";

const communityMemberSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    community: {
      type: Schema.Types.ObjectId,
      ref: "Community",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["member", "moderator", "admin"],
      default: "member",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure a user can only join a community once
communityMemberSchema.index({ user: 1, community: 1 }, { unique: true });

export const CommunityMember = mongoose.model("CommunityMember", communityMemberSchema);