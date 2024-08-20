import re

def clean_double_newline_markdown_links(text):
    """
    Remove double newlines with backslashes in markdown links within a file

    This function cleans up markdown-style links that contain double newlines
    with backslashes, while preserving emojis and the overall link structure.
    It processes the entire file, only modifying the specific markdown links.

    >>> text = "Some text\\n[📄️ Metrics\\\\\\n\\\\\\nTo monitor...](/docs/metrics/)\\nMore text"
    >>> clean_double_newline_markdown_links(text)
    'Some text\\n[📄️ Metrics To monitor...](/docs/metrics/)\\nMore text'
    """
    def replace_link(match):
        full_content = match.group(1)
        url = match.group(2)
        
        cleaned_content = re.sub(r'\\\s*\n\s*\\\s*\n\s*', ' ', full_content)
      
        return f'[{cleaned_content}]({url})'

    pattern = r'\[(.*?\\\s*\n\s*\\\s*\n\s*.*?)\]\((.*?)\)'
    cleaned_text = re.sub(pattern, replace_link, text, flags=re.DOTALL)

    return cleaned_text


def clean_anchortag_headings(text):
    """
    Replace anchortag headings with h2 tags in markdown text.

    This function replaces markdown-style anchortag headings with h2 tags.
    It processes the entire text, modifying only the specific heading patterns.

    >>> text = "Some text\\n[](#heading1)\\nHeading 1\\nMore text\\n[](#heading2)\\nHeading 2"
    >>> clean_anchortag_headings(text)
    'Some text\\n## Heading 1\\nMore text\\n## Heading 2'
    """
    return re.sub(r'\[\]\((#.*?)\)\n(.*?)(?=\n|$)', r'## \2', text)


def remove_end_matter(text):
    """
    Remove end matter including "[](#get-help)", "[Prev", and specific help text.

    This function finds the earliest occurrence of "[](#get-help)", "[Prev",
    or a specific help text, and removes everything from that point onwards.

    >>> text = "Some content\\n[](#get-help)\\nGet help here\\n[Prev]\\nPrevious content"
    >>> remove_end_matter(text)
    'Some content'
    >>> text = "Main text\\nIf you have any questions or need any help in setting things up, join our slack community and ping us in `#help` channel.\\nMore text"
    >>> remove_end_matter(text)
    'Main text'
    >>> text = "Only main content even if help mentioned"
    >>> remove_end_matter(text)
    'Only main content even if help mentioned'
    """
    remove_index = min(
        (text.find("[](#get-help)"),
         text.find("[Prev"),
         text.find("If you have any questions or need any help in setting things up, join our slack community and ping us in `#help` channel.")),
        key=lambda x: float('inf') if x == -1 else x
    )
    if remove_index != -1:
        return text[:remove_index].strip()
    return text





if __name__ == "__main__":
    import doctest
    doctest.testmod(verbose=True)