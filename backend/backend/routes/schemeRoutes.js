import express from "express";
import {
  getAllSchemes,
  createScheme,
  getSchemeById,
  updateScheme,
  deleteScheme
} from "../controllers/schemeController.js";

const router = express.Router();

router.get("/", getAllSchemes);
router.post("/", createScheme);
router.get("/:id", getSchemeById);
router.put("/:id", updateScheme);
router.delete("/:id", deleteScheme);

export default router;
