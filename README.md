# firecrawl-to-trieve
Demonstration of a Firecrawl-to-Trieve crawling-to-search pipeline.

Here is general approach:

- get the results from Firecrawl
- transform the results into chunks
- load the chunks into Trieve
- tentative: suggestions.py to pull suggested queries from Trieve—via [/chunk/suggestions](https://docs.trieve.ai/api-reference/chunk/generate-suggested-queries)—and explore the retrieval results and the data (not discussed in the blog)

## Setup

- Setup your environment variables

- Firecral API key
- Trieve API key and dataset ID

``` 
cp .env.dist .env
```

### Python


- Setup your virtual environment

```
python3 -m venv .venv
source .venv/bin/activate
```

- Install requirements

```
pip install -r requirements.txt
```

- Freeze requirements

```
pip freeze > requirements.txt
```

### Node

- Install dependencies

```
yarn install
```

## Running the scripts

### Firecrawl

- requires: `FIRECRAWL_API_KEY` in `.env`

Use Firecrawl to get the results of a crawl on the `crawl_url`, here: `https://signoz.io/docs/`.

Python in `python/`
```bash
python run_firecrawl.py
```

Node in `node/`

```bash
yarn crawl
```

This writes a json file (with a timestamp in the name) with the crawl results in a list. Key fields are the markdown itself, and then various metadata fields, including `ogUrl`, `ogTitle`, `description`, `pageStatusCode`, etc.

Example filename: `crawl_results_2024-08-20T16-35-59.json`

See the example: `example_crawl_results_2024-08-20T16-35-59.json`

### Transform: Cleaning, Chunking, and Configuring

See cleaning scripts: `python/cleaners.py` and `node/cleaners.js`

Run the transform scripts:

In `python/`

```bash
python transform.py
```

Or in `node/`

```bash
yarn transform
```

Warning: While exploring the data to determine the chunking approach we noted it had a button click that toggles between contexts, so half the content so half of the content for the page is not in the markdown. We will just flag this for now, and we'll have to see if this issue appears elsewhere.

### Loading

We can run it with `-c` to create chunks and `-u` to upsert chunks (update by tracking_id, ex. if you want to add chunks with a different split or revise your cleaning approach).

In `python/`

```bash
python load.py [-c | -u]
```

In `node/`
```bash
yarn load [-c | -u]
```

