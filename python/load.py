"""Load chunks to Trieve"""

import sys
import json
import os
import requests
from typing import List, Dict, Any
from tqdm import tqdm
import logging
import dotenv

dotenv.load_dotenv()

BATCH_SIZE = 120
DATASET_NAME = "TRIEVE_DATASET_ID_BASELINE"
CHUNK_FILENAME = max([f for f in os.listdir() if f.startswith('chunks') and f.endswith('.json') and not f.endswith('boost.json')], key=os.path.getctime)

# DATASET_NAME = "TRIEVE_DATASET_ID_BOOST"
# CHUNK_FILENAME = max([f for f in os.listdir() if f.startswith('chunks') and f.endswith('boost.json')], key=os.path.getctime)

# Set up file handler for logging
log_file = 'load.log'
file_handler = logging.FileHandler(log_file)
file_handler.setLevel(logging.INFO)
file_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))

# Configure the root logger
logger = logging.getLogger()
logger.setLevel(logging.INFO)
logger.addHandler(file_handler)

logging.info(f"Logging to file: {log_file}")



def read_chunks() -> List[Dict[str, Any]]:
    with open(CHUNK_FILENAME, 'r') as f:
        return json.load(f)

def get_configuration() -> Dict[str, str]:
    return {
        "api_key": os.getenv('TRIEVE_API_KEY'),
        "base_path": "https://api.trieve.ai",
        "dataset_id": os.getenv(DATASET_NAME)
    }


def load_chunks(chunks: List[Dict[str, Any]], config: Dict[str, str], upsert: bool = False) -> None:
    url = f"{config['base_path']}/api/chunk"
    headers = {
        "TR-Dataset": config['dataset_id'],
        "Authorization": f"Bearer {config['api_key']}",
        "Content-Type": "application/json"
    }
    try:
        for chunk in chunks:
            chunk['upsert_by_tracking_id'] = upsert

        response = requests.post(url, json=chunks, headers=headers)
        response.raise_for_status()
        logging.info(f"Successfully {'upserted' if upsert else 'created'} batch of {len(chunks)} chunks to {DATASET_NAME}")
    except requests.RequestException as e:
        logging.error(f"Failed to {'upsert' if upsert else 'create'} batch. Status code: {response.status_code}")
        logging.error(f"Response: {response.text}")
        logging.error(f"Error: {e}")
        raise e


def main():
    chunks = read_chunks()
    config = get_configuration()
    
    if len(sys.argv) != 2 or sys.argv[1] not in ['-c', '-u']:
        print("Usage: python load.py [-c|-u]")
        print("-c: create chunks")
        print("-u: upsert chunks")
        sys.exit(1)
    
    operation = sys.argv[1]
    
    
    for i in tqdm(range(0, len(chunks), BATCH_SIZE), desc="Processing chunks"):
        batch = chunks[i:i + BATCH_SIZE]
        if operation == '-c':
            load_chunks(batch, config)
        elif operation == '-u':
            load_chunks(batch, config, upsert=True)

if __name__ == "__main__":
    main()