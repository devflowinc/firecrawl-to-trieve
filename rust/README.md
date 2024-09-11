Explorations in Rust Chunking

See the output from running `cargo run` and `cargo test`

- There are some issues (failed tests) due in part to differences in the regex engines, perhaps there is another rust engine to use.
- The .md input is chunked visually into new files, and easily testable.
- The use of `pulldown_cmark` is likely an advance on the prior string matching, and possibly underutilized. 