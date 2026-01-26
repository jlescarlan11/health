import axios from 'axios';
import { FeedItem } from '../types/feed';

const BASE_URL = 'https://www2.naga.gov.ph/wp-json/wp/v2';
const HEALTH_CATEGORY_ID = 856;
const TIMEOUT = 10000;

export interface FetchHealthFeedParams {
  page: number;
  pageSize: number;
}

export const healthFeedService = {
  /**
   * Fetches health news from Naga City WP API with retry logic
   */
  fetchHealthFeed: async ({ page, pageSize }: FetchHealthFeedParams, retries = 2): Promise<FeedItem[]> => {
    try {
      const response = await axios.get(`${BASE_URL}/posts`, {
        params: {
          categories: HEALTH_CATEGORY_ID,
          page,
          per_page: pageSize,
          _embed: 1, // Include featured media and author info
        },
        timeout: TIMEOUT,
      });

      return response.data.map((post: any) => {
        // Extract image URL from embedded media if available
        let imageUrl = undefined;
        if (post._embedded && post._embedded['wp:featuredmedia'] && post._embedded['wp:featuredmedia'][0]) {
          imageUrl = post._embedded['wp:featuredmedia'][0].source_url;
        }

        // Extract author name
        let author = 'Naga City Health';
        if (post._embedded && post._embedded['author'] && post._embedded['author'][0]) {
          author = post._embedded['author'][0].name;
        }

        return {
          id: post.id.toString(),
          title: post.title.rendered.replace(/&#8211;/g, '–').replace(/&#8217;/g, "'").replace(/&nbsp;/g, ' '),
          excerpt: post.excerpt.rendered.replace(/<[^>]*>?/gm, '').trim(),
          dateISO: post.date_gmt + 'Z',
          author,
          categories: ['Health', 'News'],
          url: post.link,
          imageUrl,
          icon: 'newspaper-variant-outline',
        };
      });
    } catch (error) {
      if (retries > 0 && (!axios.isAxiosError(error) || error.code === 'ECONNABORTED')) {
        return healthFeedService.fetchHealthFeed({ page, pageSize }, retries - 1);
      }
      
      console.error('Error fetching health feed via REST API:', error);
      
      // Fallback to HTML scraping if REST API fails (404 or other errors)
      if (axios.isAxiosError(error) && error.response?.status !== 401 && error.response?.status !== 403) {
         return healthFeedService.scrapeHealthFeed({ page });
      }
      
      throw error;
    }
  },

  /**
   * Fallback scraper if REST API is blocked or insufficient
   */
  scrapeHealthFeed: async ({ page }: { page: number }): Promise<FeedItem[]> => {
    try {
      const url = page === 1 
        ? 'https://www2.naga.gov.ph/categories/news/health/'
        : `https://www2.naga.gov.ph/categories/news/health/page/${page}/`;
      
      const response = await axios.get(url, { timeout: TIMEOUT });
      const html = response.data;

      // Basic regex-based extraction (brittle, but works as a fallback)
      const posts: FeedItem[] = [];
      const articleRegex = /<article[^>]*>([\s\S]*?)<\/article>/g;
      let match;

      while ((match = articleRegex.exec(html)) !== null) {
        const content = match[1];
        
        const titleMatch = /<h2 class="entry-title"><a href="([^"]+)"[^>]*>([^<]+)<\/a><\/h2>/.exec(content);
        const excerptMatch = /<div class="entry-content">([\s\S]*?)<\/div>/.exec(content);
        const dateMatch = /<time class="entry-date published" datetime="([^"]+)"/.exec(content);
        const imgMatch = /<img[^>]+src="([^"]+)"/.exec(content);

        if (titleMatch) {
          posts.push({
            id: Buffer.from(titleMatch[1]).toString('base64').substring(0, 16),
            title: titleMatch[2].trim(),
            url: titleMatch[1],
            excerpt: excerptMatch ? excerptMatch[1].replace(/<[^>]*>?/gm, '').trim() : '',
            dateISO: dateMatch ? dateMatch[1] : new Date().toISOString(),
            author: 'Naga City Health',
            categories: ['Health'],
            imageUrl: imgMatch ? imgMatch[1] : undefined,
            icon: 'newspaper-variant-outline',
          });
        }
      }

      return posts;
    } catch (error) {
      console.error('Scraping fallback failed:', error);
      throw error;
    }
  }
};
