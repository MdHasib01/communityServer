import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";
import { schedulerService } from "./services/SchedulerService.js";

dotenv.config({
  path: "./.env",
});

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running on port ${process.env.PORT}`);
      
      // Initialize scheduler service after server starts
      schedulerService.initialize().catch(error => {
        console.error("Failed to initialize scheduler service:", error);
      });
    });
  })
  .catch((err) => {
    console.log("MongoDB connection failed!! ", err);
  });
