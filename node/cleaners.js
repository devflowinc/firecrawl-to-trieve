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
    removeEndMatter
};

export default cleaners;
