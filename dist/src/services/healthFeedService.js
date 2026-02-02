"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthFeedService = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio_1 = require("cheerio");
const prisma_1 = __importDefault(require("../lib/prisma"));
const crypto_1 = __importDefault(require("crypto"));
const HEALTH_NEWS_URL = 'https://www2.naga.gov.ph/categories/news/health/';
const TIMEOUT = 15000;
const STORED_ITEM_LIMIT = 5;
const REFRESH_INTERVAL_MS = 1000 * 60 * 15;
const DEFAULT_NEWS_COVER_IMAGE = process.env.HEALTH_FEED_DEFAULT_COVER_IMAGE?.trim() || null;
const ARTICLE_SELECTORS = ['article', '.post-card', '.category-item'];
const TITLE_SELECTORS = [
    '.entry-title a',
    '.post-card-title a',
    'h2 a',
    'h3 a',
    '.category-card__title a',
];
const EXCERPT_SELECTORS = [
    '.entry-summary',
    '.entry-content',
    '.post-summary',
    '.category-card__body',
];
const DATE_SELECTORS = [
    'time.entry-date',
    'time.published',
    '.entry-meta time',
    '.post-meta time',
    '.category-card__meta time',
];
const IMAGE_SELECTORS = ['.entry-thumbnail img', '.post-thumbnail img', '.category-card__thumb img', 'img'];
const COVER_IMAGE_META_SELECTORS = [
    'meta[property="og:image"]',
    'meta[property="og:image:secure_url"]',
    'meta[name="twitter:image"]',
    'meta[name="twitter:image:src"]',
    'meta[itemprop="image"]',
    'link[rel="image_src"]',
];
const COVER_BODY_IMAGE_SELECTORS = [
    '.entry-content img',
    '.post-content img',
    '.post-body img',
    'article img',
    '.category-card__content img',
];
const IMAGE_ATTRS = ['data-src', 'data-lazy-src', 'data-original', 'src'];
const trimText = (value) => (value ? value.replace(/\s+/g, ' ').trim() : '');
const normalizeUrl = (href, base) => {
    if (!href)
        return null;
    const trimmed = href.trim();
    if (!trimmed)
        return null;
    if (trimmed.startsWith('#') || trimmed.toLowerCase().startsWith('javascript:')) {
        return null;
    }
    try {
        const resolved = new URL(trimmed, base ?? HEALTH_NEWS_URL).toString();
        if (resolved.startsWith('data:')) {
            return null;
        }
        return resolved;
    }
    catch {
        return null;
    }
};
const extractImageFromElement = (element, attrs, base) => {
    for (const attr of attrs) {
        const value = element.attr(attr);
        const normalized = normalizeUrl(value ?? undefined, base);
        if (normalized) {
            return normalized;
        }
    }
    return null;
};
const findImageInSelectors = (root, selectors, attrs, base) => {
    for (const selector of selectors) {
        const node = root.find(selector).first();
        if (!node.length)
            continue;
        const imageUrl = extractImageFromElement(node, attrs, base);
        if (imageUrl) {
            return imageUrl;
        }
    }
    return null;
};
const findMetaCoverImage = ($, selectors, base) => {
    for (const selector of selectors) {
        const element = $(selector).first();
        if (!element.length)
            continue;
        const attrValue = element.attr('content') ?? element.attr('href');
        const normalized = normalizeUrl(attrValue ?? undefined, base);
        if (normalized) {
            return normalized;
        }
    }
    return null;
};
const parseDateIso = (raw) => {
    if (!raw)
        return new Date().toISOString();
    const cleaned = raw.replace(/\s+/g, ' ').trim();
    const parsed = new Date(cleaned);
    if (isNaN(parsed.getTime())) {
        return new Date().toISOString();
    }
    return parsed.toISOString();
};
const extractImageUrl = (article) => {
    return findImageInSelectors(article, IMAGE_SELECTORS, IMAGE_ATTRS, HEALTH_NEWS_URL);
};
const extractTitleLink = (article) => {
    for (const selector of TITLE_SELECTORS) {
        const titleElement = article.find(selector).first();
        if (!titleElement.length)
            continue;
        const title = trimText(titleElement.text());
        const url = normalizeUrl(titleElement.attr('href') ?? undefined);
        if (title && url) {
            return { title, url };
        }
    }
    return undefined;
};
const extractExcerpt = (article, $) => {
    for (const selector of EXCERPT_SELECTORS) {
        const block = article.find(selector).first();
        if (!block.length)
            continue;
        const text = trimText(block.text());
        if (text) {
            return text.replace(/Read more.*$/i, '').trim();
        }
    }
    const paragraphs = article.find('p');
    for (const paragraph of paragraphs.toArray()) {
        const text = trimText($(paragraph).text());
        if (text) {
            return text;
        }
    }
    return '';
};
const extractPublicationDate = (article) => {
    for (const selector of DATE_SELECTORS) {
        const block = article.find(selector).first();
        if (!block.length)
            continue;
        const datetimeAttr = block.attr('datetime');
        if (datetimeAttr) {
            return parseDateIso(datetimeAttr);
        }
        const text = trimText(block.text());
        if (text) {
            return parseDateIso(text);
        }
    }
    return new Date().toISOString();
};
const extractCoverImageFromArticlePage = (content, articleUrl) => {
    const $ = (0, cheerio_1.load)(content);
    const metaImage = findMetaCoverImage($, COVER_IMAGE_META_SELECTORS, articleUrl);
    if (metaImage) {
        return metaImage;
    }
    const documentSelection = $.root();
    return (findImageInSelectors(documentSelection, COVER_BODY_IMAGE_SELECTORS, IMAGE_ATTRS, articleUrl) ??
        findImageInSelectors(documentSelection, IMAGE_SELECTORS, IMAGE_ATTRS, articleUrl) ??
        null);
};
const fetchCoverImage = async (articleUrl) => {
    if (!articleUrl)
        return null;
    try {
        const response = await axios_1.default.get(articleUrl, {
            timeout: TIMEOUT,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
        });
        return extractCoverImageFromArticlePage(response.data, articleUrl);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn('Failed to fetch cover image for article:', articleUrl, errorMessage);
        return null;
    }
};
let lastSuccessfulSyncAt = null;
exports.healthFeedService = {
    shouldRefreshFeed: () => {
        if (!lastSuccessfulSyncAt)
            return true;
        return Date.now() - lastSuccessfulSyncAt > REFRESH_INTERVAL_MS;
    },
    scrapeHealthNews: async () => {
        try {
            console.log(`Fetching health news from ${HEALTH_NEWS_URL}`);
            const response = await axios_1.default.get(HEALTH_NEWS_URL, {
                timeout: TIMEOUT,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
            });
            const $ = (0, cheerio_1.load)(response.data);
            const articles = $(ARTICLE_SELECTORS.join(',')).toArray();
            const seen = new Set();
            const items = [];
            for (const element of articles) {
                const article = $(element);
                const link = extractTitleLink(article);
                if (!link)
                    continue;
                const { title, url } = link;
                if (seen.has(url))
                    continue;
                seen.add(url);
                const excerpt = extractExcerpt(article, $);
                const dateISO = extractPublicationDate(article);
                const inlineImage = extractImageUrl(article);
                const coverImage = await fetchCoverImage(url);
                const imageUrl = coverImage ?? inlineImage ?? DEFAULT_NEWS_COVER_IMAGE ?? null;
                const externalId = crypto_1.default.createHash('md5').update(url).digest('hex').substring(0, 16);
                items.push({
                    externalId,
                    title,
                    excerpt,
                    url,
                    imageUrl,
                    dateISO,
                    author: 'Naga City Health',
                });
                if (items.length >= 12) {
                    break;
                }
            }
            console.log(`Scraped ${items.length} health news items.`);
            return items;
        }
        catch (error) {
            console.error('Error scraping health news:', error);
            throw error;
        }
    },
    syncHealthNews: async () => {
        try {
            const scrapedItems = await exports.healthFeedService.scrapeHealthNews();
            if (scrapedItems.length === 0) {
                console.warn('No health news items were found during sync.');
                return;
            }
            const latestItems = scrapedItems
                .sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime())
                .slice(0, STORED_ITEM_LIMIT);
            const idsToKeep = latestItems.map((item) => item.externalId);
            for (const item of latestItems) {
                await prisma_1.default.healthFeed.upsert({
                    where: { externalId: item.externalId },
                    update: {
                        title: item.title,
                        excerpt: item.excerpt,
                        imageUrl: item.imageUrl,
                        dateISO: new Date(item.dateISO),
                        updatedAt: new Date(),
                        url: item.url,
                        author: item.author,
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
            await prisma_1.default.healthFeed.deleteMany({
                where: {
                    externalId: { notIn: idsToKeep },
                },
            });
            lastSuccessfulSyncAt = Date.now();
            console.log(`Health feed sync complete (${latestItems.length} items persisted).`);
        }
        catch (error) {
            console.error('Error syncing health news:', error);
        }
    },
    getLatestNews: async () => {
        return prisma_1.default.healthFeed.findMany({
            orderBy: { dateISO: 'desc' },
            take: STORED_ITEM_LIMIT,
        });
    },
};
//# sourceMappingURL=healthFeedService.js.map