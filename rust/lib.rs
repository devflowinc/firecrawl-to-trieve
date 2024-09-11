pub mod config;

use pulldown_cmark::{Parser, Event, Tag};

/// Chunks the input text into segments based on word count and markdown structure.
///
/// Outline:
///    - config.min_words
///    - config.max_words
///    - config.hard_limit (paragraphs break into new subparagraph chunks)
///    - try to break on headings (unless there would be a chunk that is only a heading)
///        - in that case, add the heading to the current chunk
///
/// # Arguments
///
/// * `text` - The input markdown text to be chunked
/// * `config` - The configuration to use for chunking
///
/// # Returns
///
/// A vector of chunked strings
pub fn chunk_text(text: &str, config: &config::ChunkConfig) -> Vec<String> {
    let parser = Parser::new(text);
    let mut chunks = Vec::new();
    let mut current_chunk = String::new();
    let mut current_words = 0;
    let mut in_paragraph = false;
    let mut list_depth = 0;
    
    for (event, _range) in parser.into_offset_iter() {
        match event {
            Event::Start(tag) => {
                match tag {
                    Tag::Heading(level, ..) => {
                        // If the current chunk is not empty and has content other than headings
                        if !current_chunk.is_empty() {
                            let trimmed_chunk = current_chunk.trim();
                            if !trimmed_chunk.lines().all(|line| line.starts_with('#')) {
                                chunks.push(trimmed_chunk.to_string());
                                current_chunk = String::new();
                                current_words = 0;
                            }
                        }
                        // Add the new heading to the current chunk
                        let heading_prefix = "#".repeat(level as usize);
                        if !current_chunk.is_empty() {
                            current_chunk.push_str("\n");
                        }
                        current_chunk.push_str(&heading_prefix);
                        current_chunk.push(' ');
                    }
                    Tag::Paragraph => {
                        if !current_chunk.is_empty() {
                            current_chunk.push('\n');
                        }
                        in_paragraph = true;
                    }
                    Tag::BlockQuote => {
                        current_chunk.push_str("> ");
                    }
                    Tag::List(..) => {
                        list_depth += 1;
                    }
                    Tag::Item => {
                        current_chunk.push('\n');
                        current_chunk.push_str(&"  ".repeat(list_depth - 1));
                        current_chunk.push_str("- ");
                    }
                    Tag::CodeBlock(code_block_kind) => {
                        match code_block_kind {
                            pulldown_cmark::CodeBlockKind::Fenced(lang) => {
                                current_chunk.push_str("\n```");
                                if !lang.is_empty() {
                                    current_chunk.push_str(&lang);
                                }
                                current_chunk.push('\n');
                            }
                            pulldown_cmark::CodeBlockKind::Indented => {
                                current_chunk.push_str("```\n");
                            }
                        }
                    }
                    _ => {}
                }
            }
            Event::End(tag) => {
                match tag {
                    Tag::Heading(..) => {
                        current_chunk.push_str("\n"); // Add newline after heading
                    }
                    Tag::Paragraph => {
                        in_paragraph = false;
                        current_chunk.push('\n');
                    }
                    Tag::List(..) => {
                        list_depth -= 1;
                    }
                    Tag::CodeBlock(..) => {
                        current_chunk.push_str("```\n");
                    }
                    _ => {}
                }
            }
            Event::Text(text) => {
                let words = text.split_whitespace().count();
                
                // Start a new chunk if the current one is full
                if current_words + words > config.max_words && current_words >= config.min_words {
                    chunks.push(current_chunk.trim().to_string());
                    current_chunk = String::new();
                    current_words = 0;
                }
                
                // Handle the case where a chunk starts with non-heading text
                if current_chunk.is_empty() && !text.is_empty() {
                    current_chunk.push_str(&text);
                    current_words += words;
                } else {
                    // Split long paragraphs
                    if in_paragraph && current_words + words > config.hard_limit {
                        for word in text.split_whitespace() {
                            if current_words + 1 > config.hard_limit {
                                chunks.push(current_chunk.trim().to_string());
                                current_chunk = String::new();
                                current_words = 0;
                            }
                            current_chunk.push_str(word);
                            current_chunk.push(' ');
                            current_words += 1;
                        }
                    } else {
                        current_chunk.push_str(&text);
                        if in_paragraph {
                            current_chunk.push(' ');
                        }
                        current_words += words;
                    }
                }
            }
            Event::Code(code) => {
                current_chunk.push('`');
                current_chunk.push_str(&code);
                current_chunk.push('`');
            }
            Event::SoftBreak => current_chunk.push(' '),
            Event::HardBreak => current_chunk.push_str("\n\n"),
            _ => {}
        }
    }
    
    // Add the last chunk if it's not empty
    if !current_chunk.is_empty() {
        chunks.push(current_chunk.trim().to_string());
    }
    
    chunks
}