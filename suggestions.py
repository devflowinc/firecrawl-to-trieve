import requests
import os
import dotenv
from urllib.parse import quote

dotenv.load_dotenv()

def get_configuration():
    return {
        "api_key": os.getenv('TRIEVE_API_KEY'),
        "base_path": "https://api.trieve.ai",
        "dataset_id": os.getenv('TRIEVE_DATASET_ID_BASELINE')
    }

config = get_configuration()

url = f"{config['base_path']}/api/chunk/suggestions"

payload = {"query": "<string>"}
headers = {
    "Authorization": f"Bearer {config['api_key']}",
    "TR-Dataset": config['dataset_id'],
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)

response_data = response.json()
if "queries" in response_data:
    print("Suggested queries:")
    print(response_data["queries"])
    for query in response_data["queries"]:
        query_link = f"https://search.trieve.ai/?organization=45b8a3b5-6601-4d58-b918-a8dee39a2b93&searchType=fulltext&scoreThreshold=0&extendResults=false&slimChunks=false&groupUniqueSearch=false&sort_by=%7B%7D&pageSize=10&getTotalPages=false&highlightStrategy=exactmatch&highlightResults=true&highlightThreshold=0.8&highlightDelimiters=%3F%2C.%2C%21&highlightMaxLength=8&highlightMaxNum=3&highlightWindow=0&group_size=3&useQuoteNegatedTerms=false&removeStopWords=false&filters=null&multiQueries=%5B%5D&dataset=9f93ad6f-eae2-4cb5-936b-4fc8af3375c3&query={quote(query)}"
        print(f"- {query}")
        print(f"  - Jump: {query_link}")
else:
    print("No suggested queries found in the response.")


