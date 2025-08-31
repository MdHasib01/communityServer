import { stat } from "fs";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const healthcheck = asyncHandler(async (req, res) => {
  try {
    res.send({
      status: "Healthy",
    });
  } catch (error) {
    throw new ApiError(500, "Internal server error");
  }
});

export { healthcheck };
