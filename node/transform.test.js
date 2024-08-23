import { headingMatches } from './transform';

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
