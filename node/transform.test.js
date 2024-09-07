import { headingMatches, processCrawlResults, createChunkObject, getChunkHtml, processContent, getTags } from './transform';
import fs from 'fs';
import path from 'path';
import cleaners from './cleaners';
import { jest } from '@jest/globals';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('headingMatches', () => {
  it('should extract heading links, texts, and match of heading symbols and link', () => {
    const content = `

### [](#heading-1)
Heading 1

Content for heading 1

#### [](#subheading-1-1)
Subheading 1.1

Subheading content

### [](#heading-2)
Heading 2

Content for heading 2
    `;

    

    const result = headingMatches(content, /(\n###+ \[\]\((#.*?)\))\n(.*?)\n/g);

    expect(result).toEqual([
        ['#heading-1', 'Heading 1', '\n### [](#heading-1)\nHeading 1\n'],
        ['#subheading-1-1', 'Subheading 1.1', '\n#### [](#subheading-1-1)\nSubheading 1.1\n'],
        ['#heading-2', 'Heading 2', '\n### [](#heading-2)\nHeading 2\n']
    ]);

    const content_variant = `Once the above is applied to your k8s cluster, logs collection will be disabled.
    
    
### [](#steps-to-filterexcludeinclude-logs-collection)
Steps to Filter/Exclude/Include Logs Collection

*   **Exclude certain log files** : If you want to exclude logs of certain namespaces, pods or containers, you can append the following config in your Helm override values file.
`;

    const result_variant = headingMatches(content_variant, /(\n###+ \[\]\((#.*?)\))\n(.*?)\n/g);

    expect(result_variant).toEqual([
        ['#steps-to-filterexcludeinclude-logs-collection', 'Steps to Filter/Exclude/Include Logs Collection', '\n### [](#steps-to-filterexcludeinclude-logs-collection)\nSteps to Filter/Exclude/Include Logs Collection\n']
    ]);
  });
});

describe('headingMatches—topSections', () => {
  it('should extract heading links, texts, and match of heading symbols and link', () => {
    const content = `
Javascript OpenTelemetry Instrumentation
----------------------------------------

This document contains OpenTelemetry instrumentation instructions for Javascript backend frameworks and modules based on Nodejs. If you're using self-hosted SigNoz refer to this [section](#send-traces-to-self-hosted-signoz)
. If you're using SigNoz cloud, refer to this [section](#send-traces-to-signoz-cloud)
.

[](#send-traces-to-signoz-cloud)
Send traces to SigNoz Cloud
------------------------------------------------------------


#### [](#send-traces-directly-to-signoz-cloud---no-code-automatic-instrumentation-recommended)
Send traces directly to SigNoz Cloud - No Code Automatic Instrumentation (recommended)

**Step 1.** Install OpenTelemetry packages
#### [](#send-traces-directly-to-signoz-cloud---code-level-automatic-instrumentation)
Send traces directly to SigNoz Cloud - Code Level Automatic Instrumentation

**Step 1.** Install OpenTelemetry packages

    npm install --save @opentelemetry/api@^1.6.0
    npm install --save @opentelemetry/sdk-node@^0.45.0
    npm install --save @opentelemetry/auto-instrumentations-node@^0.39.4
    npm install --save @opentelemetry/exporter-trace-otlp-http@^0.45.0
    

[](#send-traces-to-self-hosted-signoz)
Send Traces to Self-Hosted SigNoz
------------------------------------------------------------------------

  `;

    const result = headingMatches(content, /(\n\[\]\((#.*?)\))\n(.*?)\n/g);

    expect(result).toEqual([
        ['#send-traces-to-signoz-cloud', 'Send traces to SigNoz Cloud', '\n[](#send-traces-to-signoz-cloud)\nSend traces to SigNoz Cloud\n'],
        ['#send-traces-to-self-hosted-signoz', 'Send Traces to Self-Hosted SigNoz', '\n[](#send-traces-to-self-hosted-signoz)\nSend Traces to Self-Hosted SigNoz\n']
    ]);
  });
});

// Mock the dependencies
jest.mock('./transform', () => ({
  getTags: jest.fn(() => new Set(['tag1', 'tag2'])),
  createChunkObject: jest.fn((html, link, start, end, tags, title, description) => ({
    chunk_html: html,
    metadata: { url: link, start, end, tags: Array.from(tags), title, description }
  })),
  getChunkHtml: jest.fn((content, title) => `<h1>${title}</h1>${content}`),
  processContent: jest.fn((content, title, link) => [{
    chunk_html: `<h2>${title}</h2>${content.substring(0, 100)}...`,
    metadata: { url: `${link}#1`, title: title }
  }])
}), { virtual: true });

jest.mock('./cleaners', () => ({
  removeEndMatter: jest.fn(content => content)
}), { virtual: true });

describe('processCrawlResults', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process crawl results correctly', async () => {
    // Read the actual JSON file
    const testDataPath = path.join(__dirname, '..', 'test_data', 'crawl_results.json');
    const result = await processCrawlResults(testDataPath);
    // print the chunks to markdown in test-data/chunks_node.md
    fs.writeFileSync('../test_data/chunks_node.md', result.map((chunk, index) => {
      return `chunk#: ${index}\n` +
             `link: ${chunk.link}\n` +
             `tag_set: ${chunk.tag_set.join(', ')}\n` +
             `image_urls: ${chunk.image_urls.join(', ')}\n` +
             `tracking_id: ${chunk.tracking_id}\n` +
             `group_tracking_ids: ${chunk.group_tracking_ids.join(', ')}\n` +
             `${chunk.chunk_html}\n` +
             `title: ${chunk.metadata.title}\n` +
             `page_title: ${chunk.metadata.page_title}\n` +
             `${'---'.repeat(80)}\n\n`;
    }).join('\n\n'));
    // Assertions
    expect(result.length).toBeGreaterThan(0);

    // Check the structure of the first result
    const firstResult = result[0];
    expect(firstResult).toHaveProperty('chunk_html');
    expect(firstResult).toHaveProperty('tag_set');
    expect(firstResult).toHaveProperty('link');
    expect(firstResult).toHaveProperty('metadata');
    expect(firstResult.metadata).toHaveProperty('title');
    expect(firstResult.metadata).toHaveProperty('page_title');

    expect(result[34].metadata.title).toBe('Collecting Kubernetes pod logs');
    expect(result[41].metadata.title).toBe('Javascript OpenTelemetry Instrumentation: Send traces to SigNoz Cloud');
    // Check if all chunks have proper HTML structure
    result.forEach(chunk => {
      expect(chunk.chunk_html).toMatch(/(<h[1-6]>.*<\/h[1-6]>)|(<p>.*<\/p>)|(<ol>.*<\/ol>)|(<ul>.*<\/ul>)|(<li>.*<\/li>)/);
    });

    // Check if all chunks have non-empty tag_set
    result.forEach(chunk => {
      expect(Array.isArray(chunk.tag_set)).toBe(true);
    });

    // Check if all chunks have non-empty metadata
    result.forEach(chunk => {
      expect(chunk.metadata.title).toBeTruthy();
      expect(chunk.metadata.page_title).toBeTruthy();
    });

    result.forEach((chunk, index) => {
      const wordCount = chunk.chunk_html.split(/\s+/).length;
      // if wordCount is > 500, print the chunk (only for the first one)

      // if (wordCount > 500) {
      //   console.log(chunk.link);
      // }
      // console.log(index);
      // console.log(chunk.link);
      // console.log(chunk.metadata.title);

    });

    
  });
});