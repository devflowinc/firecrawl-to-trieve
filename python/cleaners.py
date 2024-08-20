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


def clean_multi_column_links(markdown_text):
    """
    Spread multi-column links in markdown text into a list format.

    This function takes markdown text containing paragraphs with multiple links
    and transforms them into a list format, with each link on a new line.

    >>> markdown_text = "Some regular text in a paragraph.\\n\\n[Link 1\\\\n\\\\nDescription 1](/url1) [Link 2\\\\n\\\\nDescription 2](/url2)\\n\\nAnother paragraph with regular text."
    >>> result = clean_multi_column_links(markdown_text)
    >>> print(result)
    Some regular text in a paragraph.
    <BLANKLINE>
    - [Link 1: Description 1](/url1)
    - [Link 2: Description 2](/url2)
    <BLANKLINE>
    Another paragraph with regular text.
    >>> markdown_text = "Send Application logs to SigNoz\\n-------------------------------\\n\\nThere are multiple ways in which you can send application logs to SigNoz\\n\\n[From log file\\\\n\\\\nRead logs from log file and push them to SigNoz](/docs/userguide/collect_logs_from_file) [Python logs Auto-Intrumentation\\\\n\\\\nCollect python logs using auto-instrumentation](/docs/userguide/python-logs-auto-instrumentation) [Using OpenTelemetry Python SDK\\\\n\\\\nSend application logs directly using OpenTelemetry Python SDK](/docs/userguide/collecting_application_logs_otel_sdk_python) [Using OpenTelemetry Java SDK\\\\n\\\\nSend application logs directly using OpenTelemetry Java SDK](/docs/userguide/collecting_application_logs_otel_sdk_java)"
    >>> result = clean_multi_column_links(markdown_text)
    >>> print(result)
    Send Application logs to SigNoz
    -------------------------------
    <BLANKLINE>
    There are multiple ways in which you can send application logs to SigNoz
    <BLANKLINE>
    - [From log file: Read logs from log file and push them to SigNoz](/docs/userguide/collect_logs_from_file)
    - [Python logs Auto-Intrumentation: Collect python logs using auto-instrumentation](/docs/userguide/python-logs-auto-instrumentation)
    - [Using OpenTelemetry Python SDK: Send application logs directly using OpenTelemetry Python SDK](/docs/userguide/collecting_application_logs_otel_sdk_python)
    - [Using OpenTelemetry Java SDK: Send application logs directly using OpenTelemetry Java SDK](/docs/userguide/collecting_application_logs_otel_sdk_java)
    """
    link_pattern = r'(\n\n)(\[(?:[^\]]+\\\s*)+[^\]]+\]\([^\)]+\)(?:\s*\[(?:[^\]]+\\\s*)+[^\]]+\]\([^\)]+\))*)\s*(?=$|\n\n)'
    
    def clean_links(match):
        links = re.findall(r'\[([^\]]+)\]\(([^\)]+)\)', match.group(2))
        cleaned_links = []
        for link_text, link_url in links:
            clean_text = link_text.replace(r'\n\n', ': ').replace('\n', ' ').strip()
            # Replace "\ \ " with ": "
            clean_text = clean_text.replace(r'\ \ ', ': ')
            cleaned_links.append(f"- [{clean_text}]({link_url})")
        return match.group(1) + '\n'.join(cleaned_links).strip()

    # Replace matching paragraphs with cleaned links
    cleaned_text = re.sub(link_pattern, clean_links, markdown_text, flags=re.DOTALL)

    

    return cleaned_text.strip()

def clean_extra_newlines_after_links(text):
    """
    This function addresses two common cases:
    1. Removes a newline between a link and a period:
        "[link text](https://example.com)\n.\n\n" => "[link text](https://example.com).\n\n"
    2. Removes a newline immediately after a link:
        "[link text](https://example.com)\n " => "[link text](https://example.com) "

    Args:
        text (str): The markdown text to clean.

    Returns:
        str: The cleaned markdown text with extra newlines after links removed.

    Examples:
        >>> text = "[link](https://example.com)\\n.\\n\\nNext paragraph."
        >>> clean_extra_newlines_after_links(text)
        '[link](https://example.com).\\n\\nNext paragraph.'

        >>> text = "[link](https://example.com)\\n next words."
        >>> clean_extra_newlines_after_links(text)
        '[link](https://example.com) next words.'

    Borderline case not affected:
        >>> text = "[link](https://example.com)\\n\\nNext good paragraph."
        >>> clean_extra_newlines_after_links(text)
        '[link](https://example.com)\\n\\nNext good paragraph.'
    """
    # Remove newline between link and period
    text = re.sub(r'(\[.*?\]\(.*?\))\n\.', r'\1.', text)
    
    # Remove newline immediately after link when it is followed by a space
    text = re.sub(r'(\[.*?\]\(.*?\))\n (?=\S)', r'\1 ', text)
    
    return text


if __name__ == "__main__":
    import doctest
    doctest.testmod()