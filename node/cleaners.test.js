import cleaners from './cleaners';

describe('cleaners', () => {
  describe('cleanDoubleNewlineMarkdownLinks', () => {
    it('should clean double newlines in markdown links', () => {
      const input = 'Some text\n[📄️ Metrics\\\n\\\nTo monitor...](/docs/metrics/)\nMore text';
      const expected = 'Some text\n[📄️ Metrics To monitor...](/docs/metrics/)\nMore text';
      expect(cleaners.cleanDoubleNewlineMarkdownLinks(input)).toBe(expected);
    });
  });

  describe('cleanAnchortagHeadings', () => {
    it('should replace anchortag headings with h2 tags', () => {
      const input = 'Some text\n[](#heading1)\nHeading 1\nMore text\n[](#heading2)\nHeading 2';
      const expected = 'Some text\n## Heading 1\nMore text\n## Heading 2';
      expect(cleaners.cleanAnchortagHeadings(input)).toBe(expected);
    });
  });

  describe('removeEndMatter', () => {
    it('should remove end matter starting with [](#get-help)', () => {
      const input = 'Some content\n[](#get-help)\nGet help here\n[Prev]\nPrevious content';
      const expected = 'Some content';
      expect(cleaners.removeEndMatter(input)).toBe(expected);
    });

    it('should remove end matter starting with specific help text', () => {
      const input = 'Main text\nIf you have any questions or need any help in setting things up, join our slack community and ping us in `#help` channel.\nMore text';
      const expected = 'Main text';
      expect(cleaners.removeEndMatter(input)).toBe(expected);
    });

    it('should not remove content if no end matter is found', () => {
      const input = 'Only main content even if help mentioned';
      const expected = 'Only main content even if help mentioned';
      expect(cleaners.removeEndMatter(input)).toBe(expected);
    });
  });
});