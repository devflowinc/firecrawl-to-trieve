pub struct ChunkConfig {
    pub min_words: usize,
    pub max_words: usize,
    pub hard_limit: usize,
}

impl Default for ChunkConfig {
    fn default() -> Self {
        ChunkConfig {
            min_words: 250,
            max_words: 500,
            hard_limit: 7400,
        }
    }
}

pub fn get_config() -> ChunkConfig {
    ChunkConfig::default()
}