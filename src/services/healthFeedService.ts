import axios from 'axios';
import { FeedItem } from '../types/feed';
import { API_URL } from './apiConfig';

const TIMEOUT = 10000;

const mapBackendItem = (item: any): FeedItem => ({
  id: item.id?.toString() ?? item.externalId ?? '',
  title: typeof item.title === 'string' ? item.title : 'Health News',
  excerpt: typeof item.excerpt === 'string' ? item.excerpt : '',
  dateISO: item.dateISO ? new Date(item.dateISO).toISOString() : new Date().toISOString(),
  author: typeof item.author === 'string' ? item.author : 'Naga City Health',
  categories: ['Health', 'News'],
  url: typeof item.url === 'string' ? item.url : '',
  imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : undefined,
  icon: 'newspaper-variant-outline',
});

export interface FetchHealthFeedParams {
  page: number;
  pageSize: number;
}

export const healthFeedService = {
  fetchHealthFeed: async (_params: FetchHealthFeedParams): Promise<FeedItem[]> => {
    const response = await axios.get(`${API_URL}/feed/health`, {
      timeout: TIMEOUT,
    });

    const payload = response.data;
    if (!Array.isArray(payload)) {
      return [];
    }

    return payload.map(mapBackendItem);
  },
};
