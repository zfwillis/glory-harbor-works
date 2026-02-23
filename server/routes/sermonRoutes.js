import express from "express";
import { getSermons } from "../controllers/sermonController.js";

const router = express.Router();

router.get("/", getSermons);

export default router;
