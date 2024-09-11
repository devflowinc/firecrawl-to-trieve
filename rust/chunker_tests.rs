use std::fs;
use std::io::Read;

// Import the chunk_text function and config module from the library
use rust_doc_chunker_lib::{chunk_text, config};

#[test]
fn test_simple_chunking() {
    let simple_text = r#"
# Introduction

This is a simple example.

It has multiple paragraphs.

## First Section

Some paragraphs are short.

Others might be longer and contain more information.

## Second Section

This is the start of another section.

It continues with more content.
"#;

    let config = config::ChunkConfig {
        min_words: 10,
        max_words: 50,
        hard_limit: 100,
    };

    let chunks = chunk_text(simple_text, &config);
    assert_eq!(chunks.len(), 3);
    assert!(chunks[0].starts_with("# Introduction"));
    assert!(chunks[1].starts_with("## First Section"));
    assert!(chunks[2].starts_with("## Second Section"));
}

#[test]
fn test_markdown_formatting() {
    let markdown_text = r#"
# Test Markdown

This is a test with **Bold text** and *italic text*.
"#;

    let config = config::ChunkConfig {
        min_words: 5,
        max_words: 20,
        hard_limit: 30,
    };

    let chunks = chunk_text(markdown_text, &config);
    assert_eq!(chunks.len(), 1);
    assert!(chunks[0].contains("**Bold text**"));
    assert!(chunks[0].contains("*italic text*"));
}

#[test]
fn test_moby_dick_chunking() {
    let mut file = fs::File::open("tests/moby-dick.md").unwrap();
    let mut contents = String::new();
    file.read_to_string(&mut contents).unwrap();

    let config = config::get_config();
    let chunks = chunk_text(&contents, &config);
    assert!(chunks.len() > 10); // Ensure we have a significant number of chunks
    
    // Check that no chunk exceeds the maximum word count
    for chunk in &chunks {
        let word_count = chunk.split_whitespace().count();
        assert!(word_count <= config.hard_limit, "Chunk exceeds maximum word count: {}", word_count);
    }

    // Check that chunks generally start with headings, new paragraphs, or non-empty content
    for (i, chunk) in chunks.iter().enumerate() {
        let trimmed = chunk.trim_start();
        assert!(
            trimmed.starts_with('#') || 
            trimmed.starts_with("CHAPTER") || 
            trimmed.chars().next().unwrap().is_uppercase() ||
            !trimmed.is_empty(),
            "Chunk {} doesn't start with heading, new paragraph, or non-empty content: {:?}",
            i,
            chunk.chars().take(20).collect::<String>()
        );
    }
}

#[test]
fn test_chunking_with_code_blocks() {
    let text_with_code = r#"
# Code Example

Here's a simple Rust function:

```rust
fn hello_world() {
    println!("Hello, world!");
}
```

And some more text after the code block.
"#;

    let config = config::ChunkConfig {
        min_words: 10,
        max_words: 50,
        hard_limit: 100,
    };
    let chunks = chunk_text(text_with_code, &config);
    assert_eq!(chunks.len(), 1);
    assert!(chunks[0].contains("```rust"));
    assert!(chunks[0].contains("```\n"));
}


#[test]
fn test_mendable_ingestion_chunking() {
    let mut file = fs::File::open("tests/mendable-ingestion.md").unwrap();
    let mut contents = String::new();
    file.read_to_string(&mut contents).unwrap();

    let config = config::get_config();
    let chunks = chunk_text(&contents, &config);

    // Confirm that there are no chunks that are only headings
    for chunk in &chunks {
        let trimmed = chunk.trim();
        assert!(
            !trimmed.starts_with('#') || trimmed.lines().count() > 1,
            "Found a chunk that is only a heading: {:?}",
            chunk
        );
    }

    // Check the first two chunks against expected content
    assert!(chunks[0].contains("## Ingestion\n\n### Mendable Platform"));
}

#[test]
fn test_signoz_ingestion_chunking() {
    let mut file = fs::File::open("tests/signoz-ingestion.md").unwrap();
    let mut contents = String::new();
    file.read_to_string(&mut contents).unwrap();

    let config = config::get_config();
    let chunks = chunk_text(&contents, &config);

    // Check that a chunk contains the correct heading without the anchor
    assert!(chunks.iter().any(|chunk| chunk.contains("### MongoDB instrumentation")));
}