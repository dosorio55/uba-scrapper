import { Router } from 'express';
import { scrapeUrl } from '../controllers/scrape.controller';

const router = Router();

router.get('/', scrapeUrl);

export { router as scrapeRouter };
