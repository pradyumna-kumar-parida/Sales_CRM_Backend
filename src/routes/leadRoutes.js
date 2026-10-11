import express from "express";
import {
  assignLead,
  convertLead,
  createLead,
  deleteLead,
  getLeadById,
  getLeads,
  updateLead,
  updateLeadStatus,
} from "../controllers/leadController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  authorize("Admin", "Sales Manager", "Sales Executive"),
  createLead,
);
router.get(
  "/",
  protect, 
  authorize("Admin", "Sales Manager", "Sales Executive"),
  getLeads,
);
router.get(
  "/:id",
  protect,
  authorize("Admin", "Sales Manager", "Sales Executive"),
  getLeadById,
);
router.patch(
  "/:id",
  protect,
  authorize("Admin", "Sales Manager", "Sales Executive"),
  updateLead,
);
router.patch(
  "/:id/assign",
  protect,
  authorize("Admin", "Sales Manager"),
  assignLead,
);
router.patch(
  "/:id/status",
  protect,
  authorize("Admin", "Sales Manager", "Sales Executive"),
  updateLeadStatus,
);

router.delete("/:id", protect, authorize("Admin", "Sales Manager"), deleteLead);
router.post(
  "/:id/convert",
  protect,
  authorize("Admin", "Sales Manager", "Sales Executive"),
  convertLead,
);
export default router;
