import fs from 'fs/promises';
import axios from 'axios';
import configs from './firecrawl_to_trieve_config.js';

const MOCK_MODE = true;
const BATCH_SIZE = 120;

async function loadChunks(chunks, config, upsert = false) {
  const url = `${config.trieveAPIBasePath}/api/chunk`;
  const headers = {
    "TR-Dataset": config.trieveDatasetId,
    "Authorization": `Bearer ${config.trieveAPIKey}`,
    "Content-Type": "application/json"
  };

  chunks.forEach(chunk => chunk.upsert_by_tracking_id = upsert);

  if (MOCK_MODE) {
    console.log(`MOCK: Would ${upsert ? 'upsert' : 'create'} batch of ` +
      `${chunks.length} chunks to ${config.trieveDatasetName}`);
    return { mock: true };
  }

  try {
    const { data } = await axios.post(url, chunks, { headers });
    console.log(`Successfully ${upsert ? 'upserted' : 'created'} batch of ` +
      `${chunks.length} chunks to ${config.trieveDatasetName}`);
    return data;
  } catch (error) {
    console.error(`Failed to ${upsert ? 'upsert' : 'create'} batch. ` +
      `Status: ${error.response?.status}, ` +
      `Data: ${JSON.stringify(error.response?.data)}, ` +
      `Message: ${error.message}`);
    throw error;
  }
}

async function processChunks(chunks, config, operation) {
  const totalChunks = chunks.length;
  let processedChunks = 0;

  for (let i = 0; i < totalChunks; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    await loadChunks(batch, config, operation === '-upsert');
    processedChunks += batch.length;
    console.log(`Processed ${processedChunks}/${totalChunks} chunks`);
  }
}

async function run() {
  const { chooseDataset, getLatestChunksFile, getConfiguration } = configs;

  const [,, operation] = process.argv;
  if (operation !== '-create' && operation !== '-upsert') {
    console.error('Usage: node load.js [-create|-upsert]');
    process.exit(1);
  }

  const datasetName = await chooseDataset();
  const chunkFilename = getLatestChunksFile();
  const config = getConfiguration(datasetName);

  const chunksData = await fs.readFile(chunkFilename, 'utf8');
  const chunks = JSON.parse(chunksData);

  await processChunks(chunks, config, operation);
}

run().catch(error => {
  console.error('An error occurred:', error);
  process.exit(1);
});
