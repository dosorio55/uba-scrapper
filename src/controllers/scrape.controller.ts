import { Request, Response } from 'express';
import puppeteer from 'puppeteer';

export const scrapeUrl = async (req: Request, res: Response) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      status: 'error',
      message: 'URL is required as a query parameter',
    });
  }

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    const page = await browser.newPage();
    
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    const pageTitle = await page.title();
    const pageContent = await page.content();
    
    await browser.close();

    res.status(200).json({
      status: 'success',
      data: {
        url,
        title: pageTitle,
        contentLength: pageContent.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to scrape the URL',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
