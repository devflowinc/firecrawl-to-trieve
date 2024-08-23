// This prepares the user configurations
// It looks at the .env to see if there are multiple dataset IDs
// It then provides configs to the transform and load scripts to appropriately:
// 1. write to
// 2. read from
// 3. ingest to

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const CONFIGS = {
  boost: false,
  maxWords: 500,
  maxDepth: 3,
  semanticBoostDistanceFactor: 0.5,
  fulltextBoostFactor: 5,
  rootUrl: 'https://signoz.io/'
};

function getDatasetOptions() {
  const envPath = path.resolve(__dirname, '../.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  return envContent.split('\n')
    .filter(line => line.startsWith('TRIEVE_DATASET_ID'))
    .map(line => line.split('=')[0].trim());
}

async function chooseDataset() {
  const datasetOptions = getDatasetOptions();

  if (datasetOptions.length === 1) {
    return datasetOptions[0];
  } else if (datasetOptions.length > 1) {
    console.log('Available dataset options:');
    datasetOptions.forEach((option, index) => {
      console.log(`${index + 1}. ${option}`);
    });

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question('Choose a dataset (enter the number): ', (answer) => {
        const choice = parseInt(answer) - 1;
        if (choice >= 0 && choice < datasetOptions.length) {
          rl.close();
          resolve(datasetOptions[choice]);
        } else {
          console.log('Invalid choice. Exiting.');
          process.exit(1);
        }
      });
    });
  } else {
    console.log('No TRIEVE_DATASET_ID found in .env file. Exiting.');
    process.exit(1);
  }
}

function getLatestChunksFile() {
  return fs.readdirSync(__dirname)
    .filter(f => f.startsWith('chunks') && f.endsWith('.json') && 
             !f.endsWith('boost.json'))
    .sort((a, b) => {
      const timeA = fs.statSync(path.join(__dirname, a)).mtime.getTime();
      const timeB = fs.statSync(path.join(__dirname, b)).mtime.getTime();
      return timeB - timeA;
    })[0];
}

function getLatestCrawlFileAndTimestamp() {
  const crawlFiles = fs.readdirSync(__dirname)
    .filter(f => f.startsWith('crawl_results') && f.endsWith('.json'))
    .sort((a, b) => b.localeCompare(a));

  console.log('Found crawl files:', crawlFiles);

  const latestFile = crawlFiles[0] || '';

  if (!latestFile) {
    return { file: '', timestamp: '' };
  }

  const timestampMatch = latestFile.match(/(\d{4}-\d{2}-\d{2}[T_]\d{2}-\d{2}-\d{2})/);
  const timestamp = timestampMatch ? timestampMatch[1].replace('T', '_') : '';
  console.log('Latest crawl file:', latestFile);
  console.log('Timestamp:', timestamp);
  return { file: latestFile, timestamp };
}

function getConfiguration(datasetName) {
  return {
    trieveAPIKey: process.env.TRIEVE_API_KEY,
    trieveAPIBasePath: "https://api.trieve.ai",
    trieveDatasetId: process.env[datasetName],
    trieveDatasetName: datasetName
  };
}

const configs = {
  CONFIGS,
  chooseDataset,
  getLatestChunksFile,
  getLatestCrawlFileAndTimestamp,
  getConfiguration
};

export default configs;