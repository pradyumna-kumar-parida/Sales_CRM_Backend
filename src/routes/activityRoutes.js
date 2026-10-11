import express from "express";

import {
  createActivity,
  getActivities,
  getActivityById,
  updateActivity,
  completeActivity,
  deleteActivity,
} from "../controllers/activityController.js";

import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  authorize("Admin", "Sales Manager", "Sales Executive"),
  createActivity,
);

router.get(
  "/",
  protect,
  authorize("Admin", "Sales Manager", "Sales Executive"),
  getActivities,
);

router.get(
  "/:id",
  protect,
  authorize("Admin", "Sales Manager", "Sales Executive"),
  getActivityById,
);

router.patch(
  "/:id",
  protect,
  authorize("Admin", "Sales Manager", "Sales Executive"),
  updateActivity,
);

router.patch(
  "/:id/complete",
  protect,
  authorize("Admin", "Sales Manager", "Sales Executive"),
  completeActivity,
);

router.delete(
  "/:id",
  protect,
  authorize("Admin", "Sales Manager"),
  deleteActivity,
);

export default router;
