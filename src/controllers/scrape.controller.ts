import { Request, Response } from "express";
import puppeteer from "puppeteer";
import type { ScrapedProduct } from "../models/product.models";
import fs from "fs/promises";
import path from "path";
import type { Page } from "puppeteer";

export const scrapeUrl = async (req: Request, res: Response) => {
  console.time("Scraping");
  console.log("Scraping URL...");

  const url = process.env.UBA_URL;

  if (!url || typeof url !== "string") {
    return res.status(400).json({
      status: "error",
      message: "URL is required as a query parameter",
    });
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  try {
    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 120000,
    });
    await page.waitForSelector("#product-grid", { timeout: 120000 });
    await scrollProductGrid(page);

    const origin = new URL(url).origin;

    const products = await scrapeProductList(page, origin);

    console.log("Enriching products...");
    const enriched = await enrichProducts(page, products as ScrapedProduct[]);

    console.log("Writing products to JSON...");
    await writeProductsJson(enriched);

    console.log("Scraping completed successfully");
    return res.status(200).json({ status: "success", data: enriched });
  } catch (error) {
    console.error("Scraping error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to scrape the URL",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    await browser.close();
    console.timeEnd("Scraping");
  }
};

async function scrollProductGrid(page: Page) {
  let prevCount = 0;

  for (let i = 0; i < 50; i++) {
    const count = await page.evaluate(() => {
      const items = document.querySelectorAll("#product-grid li.grid__item");
      const last = items[items.length - 1] as HTMLElement | undefined;

      if (last && typeof last.scrollIntoView === "function")
        last.scrollIntoView();
      return items.length;
    });

    await page.evaluate(() => new Promise((r) => setTimeout(r, 800)));
    const after = await page.evaluate(
      () => document.querySelectorAll("#product-grid li.grid__item").length
    );

    if (after <= prevCount || after <= count) break;
    prevCount = after;
  }
}

async function scrapeProductList(page: Page, origin: string) {
  console.log("Scraping product list...");

  return page.evaluate((originIn) => {
    const out: Partial<ScrapedProduct>[] = [];
    const grid = document.querySelector("#product-grid");

    if (!grid) return out;

    const items = grid.querySelectorAll("li.grid__item");

    items.forEach((li) => {
      const linkEl = li.querySelector<HTMLAnchorElement>("a.card__media");
      const rawHref = linkEl?.getAttribute("href") || undefined;
      const url = rawHref ? new URL(rawHref, originIn).toString() : undefined;
      const nameEl = li.querySelector<HTMLElement>(".card-information__text");
      const name = nameEl?.textContent?.trim() || undefined;

      const imgEls = Array.from(
        li.querySelectorAll<HTMLImageElement>(".card__media img")
      );

      const images = Array.from(
        new Set(
          imgEls
            .map((img) => img.getAttribute("src") || "")
            .filter((s) => !!s)
            .map((s) => (s.startsWith("//") ? `https:${s}` : s))
        )
      );

      const regularEl = li.querySelector(
        ".price .price__regular .price-item.price-item--regular"
      );
      const saleEl = li.querySelector(
        ".price .price__sale .price-item.price-item--sale"
      );

      const textOf = (el: Element | null) =>
        el ? el.textContent?.replace(/\s+/g, " ").trim() : undefined;
      const price = { regular: textOf(regularEl), sale: textOf(saleEl) };

      out.push({ name, url, images, price });
    });

    return out;
  }, origin);
}

async function scrapeProductDetails(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector(".product__description.rte");

    const getText = (el: Element | null) =>
      (el ? el.textContent || "" : "").replace(/\s+/g, " ").trim();

    const strip = (s: string, labels: string[]) => {
      const v = (s || "").trim();
      const low = v.toLowerCase();

      for (const lab of labels) {
        const l = lab.toLowerCase() + ":";
        if (low.startsWith(l)) return v.slice(l.length).trim();
      }

      return v;
    };

    let profile: string | undefined;
    let altitude: string | undefined;
    let process: string | undefined;
    let varietyText: string | undefined;
    let description: string | undefined;

    if (root) {
      const paragraphs = Array.from(root.querySelectorAll("p"));
      for (let idx = 0; idx < paragraphs.length; idx++) {
        const t = getText(paragraphs[idx]).toLowerCase();
        const strong = paragraphs[idx].querySelector("strong");
        const strongText = strong ? getText(strong).toLowerCase() : "";

        if (
          !profile &&
          (strongText.includes("perfil") ||
            strongText.includes("coffee cup profile") ||
            strongText.includes("profile"))
        ) {
          const next = paragraphs[idx + 1];
          const candidate = getText(next || paragraphs[idx]);
          profile = strip(candidate, [
            "perfil",
            "coffee cup profile",
            "profile",
          ]);
        }

        if (
          !altitude &&
          (t.startsWith("altitud:") ||
            strongText.startsWith("altitud") ||
            t.startsWith("altitude:") ||
            strongText.startsWith("altitude"))
        ) {
          altitude = strip(getText(paragraphs[idx]), ["altitud", "altitude"]);
        }

        if (
          !process &&
          (t.startsWith("proceso:") ||
            strongText.startsWith("proceso") ||
            t.startsWith("process:") ||
            strongText.startsWith("process"))
        ) {
          process = strip(getText(paragraphs[idx]), ["proceso", "process"]);
        }

        if (
          !varietyText &&
          (t.startsWith("variedad:") ||
            strongText.startsWith("variedad") ||
            t.startsWith("variety:") ||
            strongText.startsWith("variety"))
        ) {
          varietyText = strip(getText(paragraphs[idx]), [
            "variedad",
            "variety",
          ]);
        }
      }

      const blocks = Array.from(root.querySelectorAll("h3, p"));
      let inDesc = false;
      const descParts = [] as string[];

      for (const el of blocks) {
        const tag = (el as Element).tagName.toLowerCase();
        const txt = getText(el as Element);

        if (tag === "h3") {
          const l = txt.toLowerCase();
          if (l.includes("descrip")) {
            inDesc = true;
            continue;
          }

          if (inDesc) break;
        } else if (tag === "p" && inDesc) {
          descParts.push(txt);
        }
      }

      if (descParts.length) description = descParts.join("\n\n");
    }

    const variety: string[] = varietyText?.split(" – ") || [];

    return {
      profile,
      altitude,
      process,
      variety,
      description,
    } as Partial<ScrapedProduct>;
  });
}

async function enrichProducts(page: Page, products: ScrapedProduct[]) {
  console.time("Enriching products");
  for (let i = 0; i < products.length; i++) {
    const p = products[i];

    if (!p.url) continue;

    console.log(`Enriching product ${p.name}`);

    await page.goto(p.url, { waitUntil: "networkidle2", timeout: 120000 });

    console.log("Searching for product details...");
    const details = await scrapeProductDetails(page);

    products[i] = { ...p, ...details } as ScrapedProduct;
  }

  console.log("Products enriched successfully");
  console.timeEnd("Enriching products");

  return products;
}

async function writeProductsJson(products: ScrapedProduct[]) {
  const outPath = path.resolve(process.cwd(), "data", "products.json");

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(products, null, 2), "utf-8");
}
