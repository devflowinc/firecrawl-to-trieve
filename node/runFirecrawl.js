// Firecrawl Docs: https://docs.firecrawl.dev/features/crawl
// Firecrawl Github: https://github.com/mendableai/firecrawl/tree/main/apps/js-sdk
import FirecrawlApp from '@mendable/firecrawl-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize the FirecrawlApp with your API key
const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

// Define crawl parameters
const crawlUrl = 'https://signoz.io/docs/';
const params = {
    crawlerOptions: {
        limit: 10,
        maxDepth: 10,
        includes: ['docs/*'],
    },
    pageOptions: {
        onlyMainContent: true
    }
};

// Crawl the website
const crawlResult = await app.crawlUrl(
    crawlUrl,
    params,
    true, // wait_until_done
    2 // poll_interval
);

// Save the crawl result to a file (with a timestamp)
const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, -5);
fs.writeFileSync(`crawl_results_${timestamp}.json`, 
    JSON.stringify(crawlResult, null, 2));