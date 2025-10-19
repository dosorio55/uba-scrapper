export type ScrapedPrice = {
  regular?: string;
  sale?: string;
};

export type ScrapedProduct = {
  name?: string;
  url?: string;
  images: string[];
  price: ScrapedPrice;
  profile?: string;
  altitude?: string;
  process?: string;
  variety?: string[];
  description?: string;
};
