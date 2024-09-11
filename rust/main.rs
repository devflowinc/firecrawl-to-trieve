use rust_doc_chunker_lib::chunk_text;
use rust_doc_chunker_lib::config::ChunkConfig;

use std::fs;
use std::io::{self, Read, Write};
use rand::prelude::SliceRandom;
use regex::Regex;

// Define the array of file paths to process
const FILE_PATHS: &[&str] = &[
    "tests/moby-dick.md",
    "tests/test.md",
    "tests/signoz-ingestion.md",
    "tests/mendable-ingestion.md",
];

fn main() -> io::Result<()> {
    let config = ChunkConfig::default();

    for &file_path in FILE_PATHS {
        process_file(file_path, &config)?;
    }

    Ok(())
}

fn process_file(file_path: &str, config: &ChunkConfig) -> io::Result<()> {
    println!("Processing file: {}", file_path);

    // Read the contents of the file
    let mut file = fs::File::open(file_path)?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;

    // Clean the content
    contents = clean_content(contents);

    // Chunk the markdown content
    let chunks = chunk_text(&contents, config);

    // Write chunks to a new file
    let output_file_path = format!("{}_chunks.md", file_path.trim_end_matches(".md"));
    let mut output_file = fs::File::create(&output_file_path)?;

    for (i, chunk) in chunks.iter().enumerate() {
        writeln!(output_file, "Chunk {}:", i + 1)?;
        writeln!(output_file, "{}", chunk)?;
        writeln!(output_file, "{}", "-".repeat(80))?;
    }

    // Print statistics
    print_statistics(&chunks);

    println!("Chunks written to: {}", output_file_path);
    println!("{}", "=".repeat(80));

    Ok(())
}

fn clean_content(text: String) -> String {
    let mut cleaned = text;
    cleaned = clean_double_newline_markdown_links(cleaned);
    cleaned = clean_anchortag_headings(cleaned);
    cleaned = clean_double_asterisk_whitespace_gaps(cleaned);
    cleaned = clean_newline_and_spaces_after_links(cleaned);
    cleaned = clean_multi_column_links(cleaned);
    cleaned = clean_extra_newlines_after_links(cleaned);
    cleaned = remove_anchor_tag_from_headings(cleaned);
    cleaned = remove_end_matter(cleaned);
    cleaned
}

fn clean_double_newline_markdown_links(text: String) -> String {
    let re = Regex::new(r"\[(.*?\\\s*\n\s*\\\s*\n\s*.*?)\]\((.*?)\)").unwrap();
    re.replace_all(&text, |caps: &regex::Captures| {
        let content = caps.get(1).unwrap().as_str();
        let url = caps.get(2).unwrap().as_str();
        let cleaned_content = content.replace(r"\
\
", " ");
        format!("[{}]({})", cleaned_content, url)
    }).to_string()
}

fn clean_anchortag_headings(text: String) -> String {
    let re = Regex::new(r"\[\]\((#.*?)\)\n(.*?)\n").unwrap_or_else(|e| {
        eprintln!("Error compiling regex: {}", e);
        std::process::exit(1);
    });
    re.replace_all(&text, "$1 $2").to_string()
}

fn clean_double_asterisk_whitespace_gaps(text: String) -> String {
    let re = Regex::new(r"\*\*(\[.*?\]\(.*?\))\n\s*\*\*").unwrap();
    re.replace_all(&text, "**$1**").to_string()
}

fn clean_newline_and_spaces_after_links(text: String) -> String {
    let re = Regex::new(r"(\[.*?\]\(.*?\))\n\s*([a-z].*)").unwrap();
    re.replace_all(&text, "$1 $2").to_string()
}

fn clean_multi_column_links(text: String) -> String {
    let re = Regex::new(r"(\n\n)(\[(?:[^\]]+\\\s*)+[^\]]+\]\([^\)]+\)(?:\s*\[(?:[^\]]+\\\s*)+[^\]]+\]\([^\)]+\))*)\s*(\n\n|\z)").unwrap();
    re.replace_all(&text, |caps: &regex::Captures| {
        let newlines = caps.get(1).unwrap().as_str();
        let links = caps.get(2).unwrap().as_str();
        let link_re = Regex::new(r"\[([^\]]+)\]\(([^\)]+)\)").unwrap();
        let cleaned_links: Vec<String> = link_re.captures_iter(links)
            .map(|link_caps| {
                let link_text = link_caps.get(1).unwrap().as_str();
                let link_url = link_caps.get(2).unwrap().as_str();
                let cleaned_text = link_text
                    .replace(r"\
\
", ": ")
                    .replace(r"\
", " ")
                    .replace(r"\ \ ", ": ")
                    .trim()
                    .to_string();
                format!("- [{}]({})", cleaned_text, link_url)
            })
            .collect();
        format!("{}{}", newlines, cleaned_links.join("\n"))
    }).to_string()
}

fn clean_extra_newlines_after_links(text: String) -> String {
    let re1 = Regex::new(r"(\[.*?\]\(.*?\))\n\.").unwrap();
    let re2 = Regex::new(r"(\[.*?\]\(.*?\))\n (\S)").unwrap();
    let text = re1.replace_all(&text, "$1.");
    re2.replace_all(&text, "$1 $2").to_string()
}

fn remove_anchor_tag_from_headings(text: String) -> String {
    let re = Regex::new(r"(#.*?)\s+(#)\s+(.+)").unwrap();
    re.replace_all(&text, "$1 $3").to_string()
}


fn remove_end_matter(text: String) -> String {
    let patterns = [
        r"\[]\(#get-help\)",
        r"\[Prev",
        r"If you have any questions or need any help in setting things up, join our slack community and ping us in `#help` channel.",
    ];
    let mut remove_index = text.len();
    for pattern in patterns.iter() {
        if let Some(index) = text.find(pattern) {
            remove_index = remove_index.min(index);
        }
    }
    text[..remove_index].trim().to_string()
}

/// Prints statistics about the chunks.
///
/// # Arguments
///
/// * `chunks` - A slice of chunked strings
fn print_statistics(chunks: &[String]) {
    println!("Total chunks: {}", chunks.len());

    if let Some(random_chunk) = chunks.choose(&mut rand::thread_rng()) {
        println!("Random chunk:\n");
        print_chunks(&[random_chunk.to_string()]);
    }

    let total_words: usize = chunks.iter()
        .map(|chunk| chunk.split_whitespace().count())
        .sum();
    let avg_chunk_length = total_words as f64 / chunks.len() as f64;
    println!("Average chunk length: {:.2} words", avg_chunk_length);

    let chunks_starting_with_hash = chunks.iter()
        .filter(|chunk| chunk.trim_start().starts_with('#'))
        .count();
    println!("Chunks starting with '#': {}", chunks_starting_with_hash);

    let smallest_chunk = chunks.iter()
        .min_by_key(|chunk| chunk.split_whitespace().count());
    let smallest_word_count = smallest_chunk
        .map_or(0, |chunk| chunk.split_whitespace().count());
    println!("Smallest chunk word count: {}", smallest_word_count);
    println!("Smallest chunk: {}", smallest_chunk.unwrap());
    
    let largest_chunk = chunks.iter()
        .max_by_key(|chunk| chunk.split_whitespace().count());
    let largest_word_count = largest_chunk
        .map_or(0, |chunk| chunk.split_whitespace().count());
    println!("Largest chunk word count: {}", largest_word_count);
}

/// Prints the given chunks with formatting.
///
/// # Arguments
///
/// * `chunks` - A slice of strings to be printed
fn print_chunks(chunks: &[String]) {
    for chunk in chunks {
        println!("```\n{}\n```", chunk);
        println!("Word count: {}", chunk.split_whitespace().count());
        println!("{}", "-".repeat(80));
    }
}