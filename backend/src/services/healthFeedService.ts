import axios from 'axios';
import * as cheerio from 'cheerio';
import prisma from '../lib/prisma';
import crypto from 'crypto';

const HEALTH_NEWS_URL = 'https://www2.naga.gov.ph/categories/news/health/';
const TIMEOUT = 15000;

export interface ScrapedNewsItem {
  externalId: string;
  title: string;
  excerpt: string;
  url: string;
  imageUrl?: string;
  dateISO: string;
  author: string;
}

export const healthFeedService = {
  /**
   * Scrapes health news from Naga City website
   */
  scrapeHealthNews: async (): Promise<ScrapedNewsItem[]> => {
    try {
      console.log(`Scraping health news from: ${HEALTH_NEWS_URL}`);
      const response = await axios.get(HEALTH_NEWS_URL, { 
        timeout: TIMEOUT,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      const items: ScrapedNewsItem[] = [];

      $('article').each((_, element) => {
        const titleElement = $(element).find('.entry-title a');
        const title = titleElement.text().trim();
        const url = titleElement.attr('href') || '';
        
        const excerpt = $(element).find('.entry-content, .entry-summary').text().trim();
        
        const dateElement = $(element).find('time.entry-date');
        const dateISO = dateElement.attr('datetime') || new Date().toISOString();
        
        const imgElement = $(element).find('img');
        const imageUrl = imgElement.attr('src');
        
        if (title && url) {
          // Generate a stable externalId based on the URL
          const externalId = crypto.createHash('md5').update(url).digest('hex').substring(0, 16);
          
          items.push({
            externalId,
            title,
            excerpt,
            url,
            imageUrl,
            dateISO,
            author: 'Naga City Health'
          });
        }
      });

      console.log(`Successfully scraped ${items.length} news items.`);
      return items;
    } catch (error) {
      console.error('Error scraping health news:', error);
      throw error;
    }
  },

  /**
   * Updates the database with the latest news, keeping only the 5 most recent items.
   */
  syncHealthNews: async () => {
    try {
      const scrapedItems = await healthFeedService.scrapeHealthNews();
      
      if (scrapedItems.length === 0) return;

      // Sort by date descending and take top 5
      const latest5 = scrapedItems
        .sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime())
        .slice(0, 5);

      for (const item of latest5) {
        await prisma.healthFeed.upsert({
          where: { externalId: item.externalId },
          update: {
            title: item.title,
            excerpt: item.excerpt,
            imageUrl: item.imageUrl,
            dateISO: new Date(item.dateISO),
            updatedAt: new Date(),
          },
          create: {
            externalId: item.externalId,
            title: item.title,
            excerpt: item.excerpt,
            url: item.url,
            imageUrl: item.imageUrl,
            dateISO: new Date(item.dateISO),
            author: item.author,
          },
        });
      }

      // Cleanup: Remove items that are not in the top 5
      const allItems = await prisma.healthFeed.findMany({
        orderBy: { dateISO: 'desc' },
      });

      if (allItems.length > 5) {
        const idsToDelete = allItems.slice(5).map((item) => item.id);
        await prisma.healthFeed.deleteMany({
          where: {
            id: { in: idsToDelete }
          }
        });
        console.log(`Deleted ${idsToDelete.length} old news items.`);
      }

      console.log('Health feed sync completed.');
    } catch (error) {
      console.error('Error syncing health news:', error);
    }
  },

  /**
   * Retrieves the 5 most recent news items from the database.
   */
  getLatestNews: async () => {
    return prisma.healthFeed.findMany({
      orderBy: { dateISO: 'desc' },
      take: 5,
    });
  }
};
