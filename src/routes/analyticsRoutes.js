import express from "express";
import {
  getOverview,
  getPipeline,
  getTeamPerformance,
} from "../controllers/analyticsController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/overview",
  protect,
  authorize("Admin", "Sales Manager"),
  getOverview,
);
router.get(
  "/pipeline",
  protect,
  authorize("Admin", "Sales Manager"),
  getPipeline,
);

router.get(
  "/team-performance",
  protect,
  authorize("Admin", "Sales Manager"),
  getTeamPerformance,
);
export default router;
