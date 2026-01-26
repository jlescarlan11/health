import { Request, Response } from 'express';
import { healthFeedService } from '../services/healthFeedService';

export const healthFeedController = {
  /**
   * Get the latest health news feed
   */
  getFeed: async (_req: Request, res: Response) => {
    try {
      const news = await healthFeedService.getLatestNews();
      
      // If no news in DB, try to sync first
      if (news.length === 0) {
        await healthFeedService.syncHealthNews();
        const freshNews = await healthFeedService.getLatestNews();
        return res.json(freshNews);
      }
      
      return res.json(news);
    } catch (error) {
      console.error('Controller error fetching feed:', error);
      return res.status(500).json({ error: 'Failed to fetch health feed' });
    }
  },

  /**
   * Manually trigger a sync (useful for testing or admin)
   */
  triggerSync: async (_req: Request, res: Response) => {
    try {
      await healthFeedService.syncHealthNews();
      const news = await healthFeedService.getLatestNews();
      return res.json({ message: 'Sync completed', data: news });
    } catch (error) {
      console.error('Controller error syncing feed:', error);
      return res.status(500).json({ error: 'Failed to sync health feed' });
    }
  }
};
