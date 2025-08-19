import express from "express";
import { getAllCountries, getCountryByCode } from "../controllers/countryController.js";

const router = express.Router();

router.get("/", getAllCountries);
router.get("/:code", getCountryByCode);

export default router; // ✅ This line is mandatory for ES6 default import
