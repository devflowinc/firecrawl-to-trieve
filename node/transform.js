import fs from 'fs';
import { URL } from 'url';
import cleaners from './cleaners.js';
import MarkdownIt from 'markdown-it';
import path from 'path';

const markdown = new MarkdownIt();

const CONFIGS = {
  boost: true,
  maxWords: 500,
  maxDepth: 3,
  semanticBoostDistanceFactor: 0.5,
  fulltextBoostFactor: 5,
  rootUrl: 'https://signoz.io/'
};

const crawlResultsFiles = fs.readdirSync('.')
  .filter(file => file.startsWith('crawl_results') && file.endsWith('.json'))
  .sort((a, b) => b.localeCompare(a));

const crawlResultsFile = crawlResultsFiles[0] || '';

if (!crawlResultsFile) {
  console.error('No crawl results file found');
  process.exit(1);
}

// Get the timestamp from the crawl results file name
const TIMESTAMP = crawlResultsFile.split('_').slice(-2).join('_').split('.')[0];

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

    chunkHtml = cleaners.cleanDoubleNewlineMarkdownLinks(chunkHtml);
    chunkHtml = cleaners.cleanAnchortagHeadings(chunkHtml);

    // Skip heading-only chunks
    if (chunkHtml === `## ${headingText}`) {
      return "HEADING_ONLY";
    }

    chunkHtml = `${pageTitle}: ${headingText}\n\n${chunkHtml.trim().replace(/^-+|-+$/g, '')}`;

    return chunkHtml;
  } catch (e) {
    console.error(`Error processing chunk: ${e.message}`);
    throw e;
  }
}

function createChunk(chunkHtml, pageLink, headingLink, headingText, pageTagsSet, 
                     pageTitle, pageDescription) {
  const chunk = {
    chunk_html: chunkHtml,
    link: pageLink + headingLink,
    tags_set: pageTagsSet,
    image_urls: getImages(chunkHtml),
    tracking_id: getTrackingId(pageLink + headingLink),
    group_tracking_ids: [getTrackingId(pageLink)],
    timestamp: TIMESTAMP,
    metadata: {
      title: pageTitle + ': ' + headingText,
      page_title: pageTitle,
      page_description: pageDescription,
    }
  };

  if (CONFIGS.boost) {
    const boostPhrase = (pageTitle + " " + headingText).trim().replace(/^:\s+/, '');
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

function processContent(pageMarkdown, pageTitle, pageLink, pageTagsSet,
                        pageDescription, maxWords = CONFIGS.maxWords, maxDepth = CONFIGS.maxDepth) {
  function splitContent(content, pattern) {
    const matches = content.match(new RegExp(pattern, 'g'));
    const sections = [];
    if (matches) {
      matches.forEach((match, i) => {
        const [, headingLink, headingText] = match.match(pattern);
        const start = content.indexOf(match);
        const end = i === matches.length - 1 ? 
          content.length : 
          content.indexOf(matches[i + 1]);
        sections.push([headingLink, headingText, content.slice(start, end)]);
      });
    }
    return sections;
  }

  function createChunks(sections, currentTitle = '', depth = 0) {
    const localChunks = [];
    let lastChunkHeadingOnly = false;
    sections.forEach(([headingLink, headingText, sectionContent]) => {
      if (lastChunkHeadingOnly) {
        headingText = lastChunkHeadingOnly + " - " + headingText;
        lastChunkHeadingOnly = false;
      }

      const fullTitle = `${currentTitle}: ${headingText}`.replace(/^:\s+/, '');
      const chunkHtml = getChunkHtml(sectionContent, pageTitle, headingText, 0, null);
      if (chunkHtml === "HEADING_ONLY") {
        lastChunkHeadingOnly = headingText;
        return;
      }

      if (chunkHtml.split(/\s+/).length <= maxWords || depth >= maxDepth) {
        const chunk = createChunk(chunkHtml, pageLink, headingLink, headingText,
                                  pageTagsSet, pageTitle, pageDescription);
        chunk.metadata.title = fullTitle;
        localChunks.push(chunk);
      } else {
        const subsections = splitContent(sectionContent, 
          /(\\n###+ \\[\\]\\((#.*?)\\))\\n(.*?)\\n/);
        if (subsections.length > 0) {
          localChunks.push(...createChunks(subsections, fullTitle, depth + 1));
        } else {
          const chunk = createChunk(chunkHtml, pageLink, headingLink, headingText,
                                    pageTagsSet, pageTitle, pageDescription);
          chunk.metadata.title = fullTitle;
          localChunks.push(chunk);
        }
      }
    });
    return localChunks;
  }

  const topSections = splitContent(pageMarkdown, /(\\n\\[\\]\\((#.*?)\\))\\n(.*?)\\n/);
  return createChunks(topSections);
}

function main() {
  // Load the crawl results
  const crawlResults = JSON.parse(fs.readFileSync(crawlResultsFile, 'utf8'));

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
      chunks.push(createChunk(pageMarkdown, pageLink, '', '', pageTagsSet, 
                              pageTitle, pageDescription));
    } else {
      // Otherwise, create subpage chunks 
      chunks.push(...processContent(pageMarkdown, pageTitle, pageLink,
                                    pageTagsSet, pageDescription));
    }
  });

  // render markdown to html
  chunks.forEach(chunk => {
    chunk.chunk_html = markdown.render(chunk.chunk_html);
  });

  // Save the chunks data to chunks.json
  const chunkFilename = CONFIGS.boost ? 
    `chunks_${TIMESTAMP}_boost.json` : 
    `chunks_${TIMESTAMP}.json`;
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

  fs.writeFileSync('chunks.md', chunksMarkdown);

  console.log(`Generated chunks.md with ${chunks.length} entries`);
}

main();