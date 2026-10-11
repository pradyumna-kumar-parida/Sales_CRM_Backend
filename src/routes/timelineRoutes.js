import express from "express";
import { getTimeline } from "../controllers/timelineController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/:entityType/:entityId",
  protect,
  authorize("Admin", "Sales Manager", "Sales Executive"),
  getTimeline,
);

export default router;
