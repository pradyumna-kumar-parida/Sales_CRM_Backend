import express from "express";
import {
  createUser,
  getUserById,
  getUsers,
  updateUser,
  updateUserStatus,
} from "../controllers/userController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();
router.post("/", protect, authorize("Admin", "Sales Manager"), createUser);
router.get("/", protect, authorize("Admin", "Sales Manager"), getUsers);
router.get("/:id", protect, authorize("Admin", "Sales Manager"), getUserById);
router.patch("/:id", protect, authorize("Admin", "Sales Manager"), updateUser);
router.patch("/:id/status", protect, authorize("Admin"), updateUserStatus);

export default router;
