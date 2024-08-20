import json
import re
from urllib.parse import urlparse
import cleaners
import markdown
import os

CONFIGS = {
    'boost': True,
    'max_words': 500,
    'max_depth': 3,
    'semantic_boost_distance_factor': 0.5,
    'fulltext_boost_factor': 5,
    'root_url': 'https://signoz.io/'
}

crawl_results_files = sorted(
    [f for f in os.listdir('.') if f.startswith('crawl_results') and f.endswith('.json')],
    reverse=True
)

crawl_results_file = crawl_results_files[0] if crawl_results_files else ''

if not crawl_results_file:
    print('No crawl results file found')
    exit(1)

# Load the crawl results
with open(crawl_results_file, 'r') as f:
    crawl_results = json.load(f)

# Get the timestamp from the crawl results file name
TIMESTAMP = '_'.join(crawl_results_file.split('_')[-2:]).split('.')[0]

chunks = []

def get_tags(url):
    parsed_url = urlparse(url)
    path_parts = parsed_url.path.split('/')
    if 'docs' in path_parts:
        docs_index = path_parts.index('docs')
        # Return all non-empty tags after 'docs' except the last one
        return [tag for tag in path_parts[docs_index + 1:-1] if tag]
    return []


def get_images(markdown):
    image_pattern = r'\!\[.*?\]\((.*?\.(?:png|webp))\)'
    return re.findall(image_pattern, markdown)


def get_tracking_id(url):
    # Strip leading elements:
    url = url.replace(CONFIGS['root_url'], '')
    # Replace multiple dashes with a single dash
    return url.replace('#', '-').replace(' ', '-').replace(':', '-').replace('/', '-').replace('--', '-').strip('-')


def get_chunk_html(content, page_title, headingtext, start_index, chunk_end):
    """
    Get the content for a sub-page
    """        
    try:
        if chunk_end is not None:
            chunk_content = content[start_index:chunk_end]
        else:
            chunk_content = content[start_index:]
        chunk_text = "\n".join(chunk_content.splitlines()).strip().strip('-')
        chunk_html = f"{chunk_text.strip()}"

    except ValueError as e:
        chunk_html = f"Error processing chunk: {str(e)}"
        raise e

    chunk_html = cleaners.clean_double_newline_markdown_links(chunk_html)
    chunk_html = cleaners.clean_anchortag_headings(chunk_html)
    
    # Skip heading-only chunks
    if chunk_html == f"## {headingtext}":
        return "HEADING_ONLY"

    chunk_html = f"{page_title}: {headingtext}\n\n{chunk_html.strip().strip('-')}"

    return chunk_html


def create_chunk(chunk_html, page_link, headinglink, headingtext, page_tags_set, page_title, page_description):
    chunk = {
        'chunk_html': chunk_html,
        'link': page_link+headinglink,
        'tags_set': page_tags_set,
        'image_urls': get_images(chunk_html),
        'tracking_id': get_tracking_id(page_link+headinglink),
        'group_tracking_ids': [get_tracking_id(page_link)],
        'timestamp': TIMESTAMP,
        'metadata': {
            'title': page_title + ': ' + headingtext,
            'page_title': page_title,
            'page_description': page_description,
        }
    }
    if CONFIGS['boost']:
        boost_phrase = (page_title + " " + headingtext).strip(': ')
        chunk['semantic_boost'] = {
            "distance_factor": CONFIGS['semantic_boost_distance_factor'],
            "phrase": boost_phrase
        }
        chunk['fulltext_boost'] = {
            "boost_factor": CONFIGS['fulltext_boost_factor'],
            "phrase": boost_phrase
        }

    return chunk

def process_content(page_markdown, page_title, page_link, page_tags_set,
                    page_description, max_words=CONFIGS['max_words'], max_depth=CONFIGS['max_depth']):
    def split_content(content, pattern):
        matches = re.findall(pattern, content, re.DOTALL)
        sections = []
        for i, match in enumerate(matches):
            matchstring, headinglink, headingtext = match
            start = content.index(matchstring)
            end = len(content) if i == len(matches) - 1 else content.index(matches[i+1][0])
            sections.append((headinglink, headingtext, content[start:end]))
        return sections

    def create_chunks(sections, current_title='', depth=0):
        local_chunks = []
        last_chunk_heading_only = False
        for headinglink, headingtext, section_content in sections:
            if last_chunk_heading_only:
                headingtext = last_chunk_heading_only + " - " + headingtext
                last_chunk_heading_only = False

            full_title = f"{current_title}: {headingtext}".strip(': ')
            chunk_html = get_chunk_html(section_content, page_title, headingtext, 0, None)
            if chunk_html == "HEADING_ONLY":
                last_chunk_heading_only = headingtext
                continue
            
            if len(chunk_html.split()) <= max_words or depth >= max_depth:
                # Create chunk if within word limit or max depth reached
                chunk = create_chunk(chunk_html, page_link, headinglink, headingtext,
                                     page_tags_set, page_title, page_description)
                chunk['metadata']['title'] = full_title
                local_chunks.append(chunk)
            else:
                # Try to split into subsections
                subsections = split_content(section_content, r'(\n###+ \[\]\((#.*?)\))\n(.*?)\n')
                if subsections:
                    local_chunks.extend(create_chunks(subsections, full_title, depth + 1))
                else:
                    # If no subsections, force create a chunk
                    chunk = create_chunk(chunk_html, page_link, headinglink, headingtext,
                                         page_tags_set, page_title, page_description)
                    chunk['metadata']['title'] = full_title
                    local_chunks.append(chunk)
        return local_chunks

    # Start with top-level headings
    top_sections = split_content(page_markdown, r'(\n\[\]\((#.*?)\))\n(.*?)\n')
    return create_chunks(top_sections)

def main():

    # Iterate through each item in the crawl results
    for item in crawl_results:
        url = item['metadata']['ogUrl']

        # Skip pages with pageStatusCode != 200
        try:
            if item['metadata']['pageStatusCode'] != 200:
                continue
        except KeyError:
            raise KeyError(f"pageStatusCode not found for url: {url}")

        page_link = url
        page_title = item['metadata']['ogTitle']
        page_description = item['metadata'].get('description', '')
        page_markdown = item['markdown']
        page_tags_set = get_tags(url)

        # Remove end matter
        page_markdown = cleaners.remove_end_matter(page_markdown)

        # If the page is less than 500 words, then make one chunk for the page (baseline)
        if len(page_markdown.split(" ")) < 500:
            chunk = create_chunk(page_markdown, page_link, '', '', page_tags_set, page_title, page_description)
            chunks.append(chunk)
            continue

        # Otherwise, create subpage chunks 
        chunks.extend(process_content(page_markdown, page_title, page_link,
                                    page_tags_set, page_description))


    # render markdown to html
    for chunk in chunks:
        chunk['chunk_html'] = markdown.markdown(chunk['chunk_html'])


    # Save the chunks data to chunks.json
    chunk_filename = f'chunks_{TIMESTAMP}.json'
    if CONFIGS['boost']:
        chunk_filename = f'chunks_{TIMESTAMP}_boost.json'
    with open(chunk_filename, 'w') as f:
        json.dump(chunks, f, indent=2)

    print(f"Saved {len(chunks)} chunks to {chunk_filename}")

    # Generate chunks.md
    with open('chunks.md', 'w') as f:
        for chunk in chunks:
            f.write(f"link: {chunk['link']}\n")
            f.write(f"tag_set: {', '.join(chunk['tags_set'])}\n")
            f.write(f"image_urls: {', '.join(chunk['image_urls'])}\n")
            f.write(f"tracking_id: {chunk['tracking_id']}\n")
            f.write(f"group_tracking_ids: {', '.join(chunk['group_tracking_ids'])}\n")
            f.write(chunk['chunk_html'])
            f.write("\n" + "-" *80 + "\n\n")

    print(f"Generated chunks.md with {len(chunks)} entries")

if __name__ == "__main__":
    main()