import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { healthRouter } from "./routes/health.routes";
import { scrapeRouter } from "./routes/scrape.routes";

dotenv.config();

const holaquehace = "holaquehace";
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/health", healthRouter);
app.use("/api/scrape", scrapeRouter);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

export { app };
