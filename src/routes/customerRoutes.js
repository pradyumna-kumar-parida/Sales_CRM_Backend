import express from "express";

import {
  getCustomers,
  getCustomerById,
  updateCustomer,
  updateCustomerStatus,
  createCustomer,
  deleteCustomer,
} from "../controllers/customerController.js";

import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();
router.post(
  "/",
  protect,
  authorize("Admin", "Sales Manager", "Sales Executive"),
  createCustomer,
);
router.get(
  "/",
  protect,
  authorize("Admin", "Sales Manager", "Sales Executive"),
  getCustomers,
);

router.get(
  "/:id",
  protect,
  authorize("Admin", "Sales Manager", "Sales Executive"),
  getCustomerById,
);

router.patch(
  "/:id",
  protect,
  authorize("Admin", "Sales Manager", "Sales Executive"),
  updateCustomer,
);

router.patch(
  "/:id/status",
  protect,
  authorize("Admin", "Sales Manager"),
  updateCustomerStatus,
);

router.delete(
  "/:id",
  protect,
  authorize("Admin"),
  deleteCustomer
);
export default router;
