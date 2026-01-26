import { Request, Response } from 'express';
import { healthFeedService } from '../services/healthFeedService';

export const healthFeedController = {
  /**
   * Get the latest health news feed
   */
  getFeed: async (_req: Request, res: Response) => {
    try {
      let news = await healthFeedService.getLatestNews();

      if (news.length === 0) {
        await healthFeedService.syncHealthNews();
        news = await healthFeedService.getLatestNews();
      } else if (healthFeedService.shouldRefreshFeed()) {
        void healthFeedService.syncHealthNews();
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
