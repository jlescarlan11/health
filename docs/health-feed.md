# Health Feed Scraper Reference

## Purpose

The mobile app now consumes a single backend endpoint for the Naga City health news feed (`GET /api/feed/health`), so the client never scrapes HTML. The backend fetches the government health news page, extracts the essential fields, caches a small set of entries, and exposes structured JSON that the Feed screen already renders.

## Data Extraction Strategy

- **Selectors with fallbacks** - Articles are detected through `article`, `.post-card`, and other general wrappers. Titles are read from multiple heading/link patterns such as `.entry-title a`, `h2 a`, and `.post-card-title a`.
- **Essential fields** - Each scraped entry provides `title`, `excerpt`, `dateISO`, `url`, `imageUrl`, and a stable `externalId` derived from the source URL.
- **Image handling** - Thumbnail URLs are picked from `img` elements and honor `data-src`, `data-lazy-src`, `data-original`, and `src` before being normalized.
- **Date parsing** - Publication dates come from `time` elements or nearby text, and the parser normalizes all values into ISO 8601. Missing or invalid dates default to the current time so the feed still shows a valid entry.

## Caching and Freshness

- The backend keeps at most five records in Prisma (`STORED_ITEM_LIMIT`).
- `REFRESH_INTERVAL_MS` (15 minutes) limits how often a background sync is triggered. `GET /feed/health` returns cached data and only refreshes when that TTL expires.
- Manual refreshes are possible via `POST /feed/health/sync`, which forces the scraper to run and returns whatever dataset was produced.

## Assumptions & Limitations

- The scraper assumes the health news page continues to use recognizable wrappers (`article`, `.entry-title`, `time`, etc.). Minor tweaks are handled by the selector arrays, but a major redesign would require updating the selectors.
- Only the current health news page is scraped; there is no pagination. Very old stories beyond the five cached entries are not part of the API.
- `excerpt` values are best effort. When the summary contains HTML, the parser strips tags, extra whitespace, and trailing phrases like "Read more" before persisting.

## Failure Handling and Fallback Behavior

- Scraping errors are caught, logged, and do not throw, so controllers can still respond with cached entries.
- `GET /feed/health` always returns the stored data even if the latest refresh failed. Users see the last known headlines instead of an HTTP 500.
- Manual sync exists for humans to rerun the scraper after structural changes or connectivity issues, and the service logs each failure for follow-up.

## Client Considerations

- The mobile `healthFeedService` now only calls `/api/feed/health`; it no longer calls the WordPress REST API or performs HTML scraping.
- `HealthFeedScreen` still drives loading, error, and empty states through the Redux slice. Errors surface in the banner, and an empty set shows the "No Updates Yet" view while the backend keeps trying to replenish the cache.
