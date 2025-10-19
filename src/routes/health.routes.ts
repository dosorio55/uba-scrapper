import { Router } from "express";
import healthCheck from "../controllers/health.controller";

const router = Router();

router.get("/", healthCheck);

export { router as healthRouter };
