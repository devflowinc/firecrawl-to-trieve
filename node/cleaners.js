const cleanDoubleNewlineMarkdownLinks = (text) => {
    /**
     * Remove double newlines with backslashes in markdown links within a file
     *
     * This function cleans up markdown-style links that contain double newlines
     * with backslashes, while preserving emojis and the overall link structure.
     * It processes the entire file, only modifying the specific markdown links.
     *
     * @param {string} text - The input text to clean
     * @returns {string} The cleaned text
     */
    const replaceLink = (match, fullContent, url) => {
        const cleanedContent = fullContent.replace(/\\\s*\n\s*\\\s*\n\s*/g, ' ');
        return `[${cleanedContent}](${url})`;
    };

    const pattern = /\[(.*?\\\s*\n\s*\\\s*\n\s*.*?)\]\((.*?)\)/gs;
    return text.replace(pattern, replaceLink);
};

const cleanAnchortagHeadings = (text) => {
    /**
     * Replace anchortag headings with h2 tags in markdown text.
     *
     * This function replaces markdown-style anchortag headings with h2 tags.
     * It processes the entire text, modifying only the specific heading patterns.
     *
     * @param {string} text - The input text to clean
     * @returns {string} The cleaned text
     */
    return text.replace(/\[\]\((#.*?)\)\n(.*?)(?=\n|$)/g, '## $2');
};

const cleanDoubleAsteriskWhitespaceGaps = (text) => {
    /**
     * When double asterisks appear immediately before the start of a link,
     * they may appear after the link after a newline.
     * 
     * Example:
     * ```
     * **[Use the all-in-one auto-instrumentation library(Recommended)](#using-the-all-in-one-auto-instrumentation-library)\n    **
     * ```
     *
     * This function processes the entire text, replacing the whitespace before the second double asterisk pair
     * with an empty string.
     *
     * @param {string} text - The input text to clean
     * @returns {string} The cleaned text
     */
    return text.replace(/\*\*(\[.*\]\(.*\))\n\s*\*\*/g, '**$1**');
};


const cleanNewlineAndSpacesAfterLinks = (text) => {
    /**
     * Remove newline after links followed by lowercase characters in markdown.
     *
     * This function removes a newline and trims spaces to one when a markdown
     * link is immediately followed by a newline, arbitrary spaces, and then
     * a lowercase character.
     *
     * @param {string} text - The input text to clean
     * @returns {string} The cleaned text
     */
    // This regex replaces a pattern where a markdown link is followed by a newline,
    // optional whitespace, and then a lowercase letter.
    // The replacement keeps the link ($1), adds a single space,
    // and preserves the content that follows ($2).
    // This ensures we keep the subsequent text "alive" in the output.
    return text.replace(/(\[.*?\]\(.*?\))\n\s*([a-z].*)/g, '$1 $2');
};



const cleanMultiColumnLinks = (markdownText) => {
    /**
     * Spread multi-column links in markdown text into a list format.
     *
     * This function takes markdown text containing paragraphs with multiple links
     * and transforms them into a list format, with each link on a new line.
     *
     * @param {string} markdownText - The input markdown text to clean
     * @returns {string} The cleaned markdown text
     */
    const linkPattern = /(\n\n)(\[(?:[^\]]+\\\s*)+[^\]]+\]\([^\)]+\)(?:\s*\[(?:[^\]]+\\\s*)+[^\]]+\]\([^\)]+\))*)\s*(?=$|\n\n)/g;
    
    const cleanLinks = (match, newlines, links) => {
        const cleanedLinks = links.match(/\[([^\]]+)\]\(([^\)]+)\)/g).map(link => {
            const [, linkText, linkUrl] = link.match(/\[([^\]]+)\]\(([^\)]+)\)/);
            const cleanText = linkText.replace(/\\\s*\n\s*\\\s*\n\s*/g, ': ')
                                      .replace(/\s*\\\s*\n\s*/g, ' ')
                                      .replace(/\\ \\ /g, ': ')
                                      .trim();
            return `- [${cleanText}](${linkUrl})`;
        });
        return newlines + cleanedLinks.join('\n');
    };

    return markdownText.replace(linkPattern, cleanLinks).trim();
};



const cleanExtraNewlinesAfterLinks = (text) => {
    /**
     * Remove extra newlines after links in markdown text.
     *
     * This function addresses two common cases:
     * 1. Removes a newline between a link and a period.
     * 2. Removes a newline immediately after a link when followed by a space.
     *
     * @param {string} text - The input text to clean
     * @returns {string} The cleaned text with extra newlines after links removed
     */
    // Remove newline between link and period
    text = text.replace(/(\[.*?\]\(.*?\))\n\./g, '$1.');
    
    // Remove newline immediately after link when it is followed by a space
    text = text.replace(/(\[.*?\]\(.*?\))\n (?=\S)/g, '$1 ');
    
    return text;
};


const removeEndMatter = (text) => {
    /**
     * Remove end matter including "[](#get-help)", "[Prev", and specific help text.
     *
     * This function finds the earliest occurrence of "[](#get-help)", "[Prev",
     * or a specific help text, and removes everything from that point onwards.
     *
     * @param {string} text - The input text to clean
     * @returns {string} The cleaned text
     */
    const patterns = [
        /\[]\(#get-help\)/,
        /\[Prev/,
        /If you have any questions or need any help in setting things up, join our slack community and ping us in `#help` channel./
    ];

    const indices = patterns.map(pattern => text.search(pattern))
                            .filter(index => index !== -1);

    if (indices.length > 0) {
        const removeIndex = Math.min(...indices);
        return text.slice(0, removeIndex).trim();
    }

    return text;
};

const cleaners = {
    cleanDoubleNewlineMarkdownLinks,
    cleanAnchortagHeadings,
    cleanExtraNewlinesAfterLinks,
    removeEndMatter,
    cleanMultiColumnLinks,
    cleanNewlineAndSpacesAfterLinks,
    cleanDoubleAsteriskWhitespaceGaps
};

export default cleaners;