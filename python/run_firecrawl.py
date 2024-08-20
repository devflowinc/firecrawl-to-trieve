# Firecrawl Docs: https://docs.firecrawl.dev/features/crawl
# Firecrawl Github: https://github.com/mendableai/firecrawl/tree/main/apps/python-sdk
import os
import json
import time
from firecrawl import FirecrawlApp
import dotenv

dotenv.load_dotenv(dotenv.find_dotenv(filename='../.env'))

# Initialize the FirecrawlApp with your API key
app = FirecrawlApp(api_key=os.getenv('FIRECRAWL_API_KEY'))

# Define crawl parameters
crawl_url = 'https://signoz.io/docs/'
params = {
    'crawlerOptions': {
        'limit': 1000,
        'maxDepth': 10,
        'includes': ['docs/*'],
    },
    'pageOptions': {
        'onlyMainContent': True
    }
}

# Crawl the website
crawl_result = app.crawl_url(
    url=crawl_url,
    params=params,
    wait_until_done=True,
    poll_interval=2
)

# Save the crawl result to a file (with a timestamp)
with open(f'crawl_results_{time.strftime("%Y-%m-%d_%H-%M-%S")}.json', 'w') as f:
    json.dump(crawl_result, f, indent=2)