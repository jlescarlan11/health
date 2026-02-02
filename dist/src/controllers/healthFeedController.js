"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthFeedController = void 0;
const healthFeedService_1 = require("../services/healthFeedService");
exports.healthFeedController = {
    getFeed: async (_req, res) => {
        try {
            let news = await healthFeedService_1.healthFeedService.getLatestNews();
            if (news.length === 0) {
                await healthFeedService_1.healthFeedService.syncHealthNews();
                news = await healthFeedService_1.healthFeedService.getLatestNews();
            }
            else if (healthFeedService_1.healthFeedService.shouldRefreshFeed()) {
                void healthFeedService_1.healthFeedService.syncHealthNews();
            }
            return res.json(news);
        }
        catch (error) {
            console.error('Controller error fetching feed:', error);
            return res.status(500).json({ error: 'Failed to fetch health feed' });
        }
    },
    triggerSync: async (_req, res) => {
        try {
            await healthFeedService_1.healthFeedService.syncHealthNews();
            const news = await healthFeedService_1.healthFeedService.getLatestNews();
            return res.json({ message: 'Sync completed', data: news });
        }
        catch (error) {
            console.error('Controller error syncing feed:', error);
            return res.status(500).json({ error: 'Failed to sync health feed' });
        }
    }
};
//# sourceMappingURL=healthFeedController.js.map