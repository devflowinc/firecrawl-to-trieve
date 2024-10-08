import fs from 'fs';
import { URL } from 'url';
import cleaners from './cleaners.js';
import MarkdownIt from 'markdown-it';
import path from 'path';
import configs from './firecrawl_to_trieve_config.js';

const MOCK_MODE = false;

// Use CONFIGS from firecrawl_to_trieve_config.js
const CONFIGS = configs.CONFIGS;

const markdown = new MarkdownIt();
const chunks = [];

function getTags(url) {
  const parsedUrl = new URL(url);
  const pathParts = parsedUrl.pathname.split('/');
  if (pathParts.includes('docs')) {
    const docsIndex = pathParts.indexOf('docs');
    // Return all non-empty tags after 'docs' except the last one
    return pathParts.slice(docsIndex + 1, -1).filter(tag => tag);
  }
  return [];
}

function getImages(markdownContent) {
  const imagePattern = /!\[.*?\]\((.*?\.(?:png|webp))\)/g;
  const matches = markdownContent.match(imagePattern);
  return matches ? matches.map(match => match.match(/\((.*?)\)/)[1]) : [];
}

function getTrackingId(url) {
  return url.replace('https://signoz.io/', '')
    .replace(/#/g, '-')
    .replace(/\s/g, '-')
    .replace(/:/g, '-')
    .replace(/\//g, '-')
    .replace(/--/g, '-')
    .trim()
    .replace(/^-|-$/g, '');
}

function getChunkHtml(content, pageTitle, headingText, startIndex, chunkEnd) {
  try {
      const chunkContent = chunkEnd !== null ?
          content.slice(startIndex, chunkEnd) :
          content.slice(startIndex);
      let chunkText = chunkContent.split('\n').join('\n').trim().replace(/^-+|-+$/g, '');
      let chunkHtml = chunkText.trim();

      chunkHtml = cleaners.cleanMultiColumnLinks(chunkHtml);
      chunkHtml = cleaners.cleanAnchortagHeadings(chunkHtml);
      chunkHtml = cleaners.cleanExtraNewlinesAfterLinks(chunkHtml);
      chunkHtml = cleaners.cleanDoubleAsteriskWhitespaceGaps(chunkHtml);
      chunkHtml = cleaners.cleanNewlineAndSpacesAfterLinks(chunkHtml);
      

      // Skip heading-only chunks
      if (chunkHtml.trim().split('\n').length <= 1) {
          return {"HEADING_ONLY": chunkHtml.trim()};
      }
  
      if (headingText === "") {
        chunkHtml = chunkHtml.trim().replace(/^-+|-+$/g, '');
      } else {
        const headingLine = `${pageTitle}: ${headingText}`;
        const lines = chunkHtml.split('\n');
        lines[0] = headingLine;
        chunkHtml = lines.join('\n');
      }
      return chunkHtml;
  } catch (e) {
      console.error(`Error processing chunk: ${e.message}`);
      throw e;
  }
}

function createChunkObject(chunkHtml, pageLink, headingLink, headingText, pageTagsSet, 
                     pageTitle, pageDescription) {
  const chunk = {
    chunk_html: chunkHtml,
    link: pageLink + headingLink,
    tags_set: pageTagsSet,
    image_urls: getImages(chunkHtml),
    tracking_id: getTrackingId(pageLink + headingLink),
    group_tracking_ids: [getTrackingId(pageLink)],
    timestamp: CONFIGS.TIMESTAMP,
    metadata: {
      title: pageTitle + (headingText.length > 0 ? ': ' + headingText : ''),
      page_title: pageTitle,
      page_description: pageDescription,
    }
  };

  if (CONFIGS.boost) {
    const boostPhrase = (pageTitle + " " + (headingText || '')).trim().replace(/^:\s+/, '');
    chunk.semantic_boost = {
      distance_factor: CONFIGS.semanticBoostDistanceFactor,
      phrase: boostPhrase
    };
    chunk.fulltext_boost = {
      boost_factor: CONFIGS.fulltextBoostFactor,
      phrase: boostPhrase
    };
  }

  return chunk;
}

export function headingMatches(content, pattern) {
  const matches = Array.from(content.matchAll(pattern));
  return matches.map(match => [
    match[2], // headingLink
    match[3], // headingText
    match[0]  // heading symbols and link
  ]);
}

export function splitContent(content, pattern) {
    const matches = headingMatches(content, pattern);
    const sections = [];

    let preSplitContent = content;
    if (matches.length > 0) {
        let firstMatch = matches[0];

        if (firstMatch) {
            preSplitContent = content.split(firstMatch[2])[0];
            if (preSplitContent.trim().length > 0) {
                sections.push(["", "", preSplitContent]);
            }
        }
    }

    for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const [headingLink, headingText, matchString] = match;
        const start = content.indexOf(matchString);
        let end;

        if (i < matches.length - 1) {
            end = content.indexOf(matches[i + 1][2]);
        } else {
            end = content.length;
        }

        if (start === -1 || end === -1) {
            throw new Error('Invalid start or end index when splitting content');
        }

        sections.push([headingLink, headingText, content.slice(start, end)]);
    }

    return sections;
}

function processContent(pageMarkdown, pageTitle, pageLink, pageTagsSet,
                        pageDescription, maxWords = CONFIGS.maxWords, maxDepth = CONFIGS.maxDepth) {

  

  // Creates chunks from sections
  function createChunks(sections, currentTitle = '', depth = 0) {
    const localChunks = [];
    let isLastChunkHeadingOnly = false;

    sections.forEach(([headingLink, headingText, sectionContent]) => {
      if (isLastChunkHeadingOnly) {
        headingText = `${isLastChunkHeadingOnly} - ${headingText}`;
        isLastChunkHeadingOnly = false;
      }
      
      const chunkHtml = getChunkHtml(sectionContent, pageTitle, headingText, 0, null);
      

      try {
          isLastChunkHeadingOnly = chunkHtml["HEADING_ONLY"]
      } catch (TypeError) {
          isLastChunkHeadingOnly = false
      }
      if (isLastChunkHeadingOnly) {
        return; // Skip to the next iteration
      } else {

        


        const fullTitle = `${currentTitle}: ${headingText}`.replace(/^:\s+/, '');
        const chunkWordCount = chunkHtml.split(/\s+/).length;
        const isWithinChunkingConstrains = chunkWordCount <= maxWords || depth >= maxDepth;
        // true if the chunk is within the word limit or we've reached max depth.
        // we don't split further at max depth, even if over word limit

        if (isWithinChunkingConstrains) {
          // Create chunk if within word limit or max depth reached
          let chunk = createChunkObject(chunkHtml, pageLink, headingLink, headingText,
                                            pageTagsSet, pageTitle, pageDescription);
          chunk.metadata.title = fullTitle;
          localChunks.push(chunk);
        } else {
          // Try to split into subsections
          const subsections = splitContent(sectionContent, 
            /(\\n###+ \\[\\]\\((#.*?)\\))\\n(.*?)\\n/g);
          // regex to find subsections of the current section
          if (subsections.length > 0) {
            localChunks.push(...createChunks(subsections, fullTitle, depth + 1));
          } else {
            // If no subsections, force create a chunk
            let chunk = createChunkObject(chunkHtml, pageLink, headingLink, headingText,
                                                pageTagsSet, pageTitle, pageDescription);
            chunk.metadata.title = fullTitle;
            localChunks.push(chunk);
          }
        }
      }
    });

    return localChunks;
  }

  const topSections = splitContent(pageMarkdown, /(\n\[\]\((#.*?)\))\n(.*?)\n/g);
  return createChunks(topSections, pageTitle);
}

async function main() {
  // Choose dataset
  const chosenDataset = await configs.chooseDataset();
  const configuration = configs.getConfiguration(chosenDataset);

  // Get the latest crawl results file
  const { file: crawlResultsFile, timestamp: TIMESTAMP } = configs.getLatestCrawlFileAndTimestamp();

  if (!crawlResultsFile) {
    console.error('No crawl results file found');
    process.exit(1);
  }

  // Load the crawl results
  const crawlResults = JSON.parse(fs.readFileSync(crawlResultsFile, 'utf8'));
  console.log(`Loaded ${crawlResults.length} crawl results from ${crawlResultsFile}`);
  // Iterate through each item in the crawl results
  crawlResults.forEach(item => {
    const url = item.metadata.ogUrl;

    // Skip pages with pageStatusCode != 200
    try {
      if (item.metadata.pageStatusCode !== 200) return;
    } catch (error) {
      throw new Error(`pageStatusCode not found for url: ${url}`);
    }

    const pageLink = url;
    const pageTitle = item.metadata.ogTitle;
    const pageDescription = item.metadata.description || '';
    let pageMarkdown = item.markdown;
    const pageTagsSet = getTags(url);

    // Remove end matter
    pageMarkdown = cleaners.removeEndMatter(pageMarkdown);

    // If the page is less than 500 words, then make one chunk for the page (baseline)
    if (pageMarkdown.split(/\s+/).length < 500) {
      chunks.push(createChunkObject(getChunkHtml(pageMarkdown, pageTitle, '', 0, null), pageLink, '', '', pageTagsSet, 
                              pageTitle, pageDescription));
    } else {
      // Otherwise, create subpage chunks 
      chunks.push(...processContent(pageMarkdown, pageTitle, pageLink,
                                    pageTagsSet, pageDescription));
    }
  });

  // strip ":" from title if it ends with it
  chunks.forEach(chunk => {
    chunk.metadata.title = chunk.metadata.title.replace(/:\s*$/, '');
  });

  // render markdown to html
  chunks.forEach(chunk => {
    chunk.chunk_html = markdown.render(chunk.chunk_html);
    // Replace <br> with <br />
    chunk.chunk_html = chunk.chunk_html.replace(/<br>/g, '<br />');
    // Replace <hr> with <hr />
    chunk.chunk_html = chunk.chunk_html.replace(/<hr>/g, '<hr />');
    // Replace <img ...> with <img ... />
    chunk.chunk_html = chunk.chunk_html.replace(/<img\s+([^>]*)>/g, '<img $1 />');
  });

  if (MOCK_MODE) {
    console.log(`MOCK: Would generate ${chunks.length} chunks from ${crawlResultsFile}, saving to .json and .md files`);
    return;
  }

  // Save the chunks data to chunks.json
  const chunkFilename = `chunks_${TIMESTAMP}_${configuration.trieveDatasetName}.json`;
  fs.writeFileSync(chunkFilename, JSON.stringify(chunks, null, 2));

  console.log(`Saved ${chunks.length} chunks to ${chunkFilename}`);

  // Generate chunks.md
  const chunksMarkdown = chunks.map(chunk => 
    `link: ${chunk.link}\n` +
    `tag_set: ${chunk.tags_set.join(', ')}\n` +
    `image_urls: ${chunk.image_urls.join(', ')}\n` +
    `tracking_id: ${chunk.tracking_id}\n` +
    `group_tracking_ids: ${chunk.group_tracking_ids.join(', ')}\n` +
    `${chunk.chunk_html}\n` +
    '-'.repeat(80) + '\n\n'
  ).join('');

  fs.writeFileSync(`chunks_${configuration.trieveDatasetName}.md`, chunksMarkdown);

  console.log(`Generated chunks_${configuration.trieveDatasetName}.md with ${chunks.length} entries`);
}

main();