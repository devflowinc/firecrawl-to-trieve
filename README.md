# firecrawl-to-trieve
Demonstration of a Firecrawl-to-Trieve crawling-to-search pipeline.

Directions to run on your own are at bottom: [Setup](#setup).

## Python

Here is the Python approach:

- get the results from Firecrawl
- transform the results into chunks
- load the chunks into Trieve
- tentative: suggestions.py to pull suggested queries from Trieve and explore the retrieval results and the data.


### (0) get results from Firecrawl

- requires: `FIRECRAWL_API_KEY` in `.env`

Use Firecrawl to get the results of a crawl on the `crawl_url`, here: `https://signoz.io/docs/`.

```
python run_firecrawl.py
```

This returns a json file with the crawl results in a list. Key fields are the markdown itself, and then various metadata fields, including `ogUrl`, `ogTitle`, `description`, `pageStatusCode`, etc.

### (1) how to chunk the markdown

Your crawl results file has a `markdown` field that contains the full markdown text of the page. I did some initial data cleaning as I worked out the chunking, you can always add more cleaning later.

- Initial cleaning functions are in `cleaners.py`, imported into the transform script.

But we might as well load them into Trieve start searching to see if there is more that needs to be cleaned.

For a baseline chunking approach we just want to find ways to reduce split pages into smaller chunks, while maintaining some semantic cohesion within the chunks. 

Our transform script will make chunks of any page that is less than 500 words, then chunk by top-level anchor links (e.g. `[](#overview)\nOverview` ) and then splitting by h3, h4, etc (e.g. `### [](#step-1-setup-otel-collector)\n`). (Explicit h1-h2 (i.e. `# this-is-h1` and `## this-is-h2`) headings for this dataset are not indicated in the markdown. The html itself has h2 headings for both the page title and for what is rendered here as the top-level anchor link headings.)

This transform script will recursively split longer markdown content whenever the output is greater than 500 words (via a crude split on whitespace) or until the split is at h4. It will also add new fields:

- tracking_id: created from the URL + the id of the heading for splits
- group_tracking_ids: created from the URL segments (ex. `https://signoz.io/docs/install/kubernetes/` -> `['install', 'kubernetes']`)
- tag_set: parsed from the URL segments (ex. `https://signoz.io/docs/install/kubernetes/` -> `['install', 'kubernetes']`)
- image_urls: parsed from the markdown (looking for png and webp images)
- metadata: parsed from the metadata (saving the title, description (if it exists), in case useful later)

```
python transform_chunks.py
```

Warning: While exploring the data to determine the chunking approach we noted it had a button click that toggles between contexts, so half the content so half of the content for the page is not in the markdown. We will just flag this for now, and we'll have to see if this issue appears elsewhere.

### (2) load the chunks into Trieve

We have a script `load.py` that loads the chunks into Trieve. We can run it with `-c` to create chunks and `-u` to upsert chunks (update by tracking_id, ex. if you want to add chunks with a different split or revise your cleaning approach).

highlight that groups get automatically created when you pass a tracking-id for group_tracking_ids which does not exist)



## Setup

- Setup your environment variables

``` 
cp .env.dist .env
```

# Python


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
>>>>>>> ff432f2 (initial commit)
