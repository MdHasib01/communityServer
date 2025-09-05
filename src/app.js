{
  "name": "video_sharing_platform_backend",
  "version": "1.0.0",
  "description": "",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "dev": "nodemon -r dotenv/config --experimental-json-modules src/index.js",
import commentRouter from "./routes/comment.routes.js";
import likeRouter from "./routes/like.routes.js";
import followRouter from "./routes/follow.routes.js";
import bookmarkRouter from "./routes/bookmark.routes.js";
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "nodemon": "^3.1.10",
    "prettier": "^3.6.2"
  },
  "dependencies": {
    "axios": "^1.11.0",
    "bcrypt": "^6.0.0",
    "cheerio": "^1.1.2",
    "cloudinary": "^2.7.0",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "dotenv": "^17.2.2",
    "express": "^5.1.0",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.18.0",
    "mongoose-aggregate-paginate-v2": "^1.1.4",
    "multer": "^2.0.2",
    "node-cron": "^4.2.1"
  }
}
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/follows", followRouter);
app.use("/api/v1/bookmarks", bookmarkRouter);
