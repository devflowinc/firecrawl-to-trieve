import os
import json
import time
from firecrawl import FirecrawlApp
import dotenv

dotenv.load_dotenv()

app = FirecrawlApp(api_key=os.getenv('FIRECRAWL_API_KEY'))

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
crawl_result = app.crawl_url(
    url=crawl_url,
    params=params,
    wait_until_done=True,
    poll_interval=2
)

with open(f'crawl_results_{time.strftime("%Y-%m-%d_%H-%M-%S")}.json', 'w') as f:
    json.dump(crawl_result, f, indent=2)