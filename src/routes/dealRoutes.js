import express from "express";
import {
  createDeal,
  getDeals,
  getDealById,
  updateDeal,
  updateDealStage,
} from "../controllers/dealController.js";

import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  authorize("Admin", "Sales Manager", "Sales Executive"),
  createDeal,
);

router.get(
  "/",
  protect,
  authorize("Admin", "Sales Manager", "Sales Executive"),
  getDeals,
);

router.get(
  "/:id",
  protect,
  authorize("Admin", "Sales Manager", "Sales Executive"),
  getDealById,
);

router.patch(
  "/:id",
  protect,
  authorize("Admin", "Sales Manager", "Sales Executive"),
  updateDeal,
);

router.patch(
  "/:id/stage",
  protect,
  authorize("Admin", "Sales Manager", "Sales Executive"),
  updateDealStage,
);

export default router;
