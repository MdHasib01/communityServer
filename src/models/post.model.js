@@ .. @@
 import mongoose, { Schema } from "mongoose";
 import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
 
-const videoSchema = new Schema(
+const postSchema = new Schema(
   {
-    videoFile: {
-      type: {
-        url: String,
-        public_id: String,
-      },
-      required: true,
-    },
-    thumbnail: {
-      type: {
-        url: String,
-        public_id: String,
-      },
-      required: true,
-    },
     title: {
       type: String,
       required: true,
+      trim: true,
+      index: true,
     },
-    description: {
+    content: {
       type: String,
       required: true,
     },
-    duration: {
-      type: Number,
-      required: true,
+    sourceUrl: {
+      type: String,
+      required: true,
+      unique: true, // Prevent duplicate posts
     },
-    views: {
+    platform: {
+      type: String,
+      required: true,
+      enum: ["reddit", "twitter", "linkedin", "medium"],
+      index: true,
+    },
+    originalId: {
+      type: String,
+      required: true,
+      index: true,
+    },
+    community: {
+      type: Schema.Types.ObjectId,
+      ref: "Community",
+      required: true,
+      index: true,
+    },
+    owner: {
+      type: Schema.Types.ObjectId,
+      ref: "User",
+      required: true,
+      index: true,
+    },
+    engagementMetrics: {
+      likes: {
+        type: Number,
+        default: 0,
+      },
+      comments: {
+        type: Number,
+        default: 0,
+      },
+      shares: {
+        type: Number,
+        default: 0,
+      },
+      views: {
+        type: Number,
+        default: 0,
+      },
+    },
+    scrapingMetadata: {
+      scrapedAt: {
+        type: Date,
+        default: Date.now,
+      },
+      originalAuthor: {
+        type: String,
+      },
+      originalCreatedAt: {
+        type: Date,
+      },
+      qualityScore: {
+        type: Number,
+        min: 0,
+        max: 1,
+        default: 0.5,
+      },
+      tags: [String],
+    },
+    status: {
+      type: String,
+      enum: ["active", "hidden", "flagged", "deleted"],
+      default: "active",
+      index: true,
+    },
+    thumbnail: {
+      type: String, // URL to thumbnail image
+    },
+    mediaUrls: [
+      {
+        type: String,
+        url: String,
+      },
+    ],
+    localEngagement: {
+      likes: {
         type: Number,
         default: 0,
       },
-    isPublished: {
-      type: Boolean,
-      default: false,
+      comments: {
+        type: Number,
+        default: 0,
+      },
+      bookmarks: {
+        type: Number,
+        default: 0,
+      },
     },
-    owner: {
-      type: Schema.Types.ObjectId,
-      ref: "User",
+    isPromoted: {
+      type: Boolean,
+      default: false,
     },
   },
   {
@@ -135,6 +195,12 @@
   }
 );
 
-videoSchema.plugin(mongooseAggregatePaginate);
+postSchema.plugin(mongooseAggregatePaginate);
+
+// Compound indexes for efficient querying
+postSchema.index({ community: 1, status: 1, createdAt: -1 });
+postSchema.index({ platform: 1, originalId: 1 }, { unique: true });
+postSchema.index({ "scrapingMetadata.scrapedAt": -1 });
+postSchema.index({ "scrapingMetadata.qualityScore": -1 });
 
-export const Video = mongoose.model("Video", videoSchema);
+export const Post = mongoose.model("Post", postSchema);