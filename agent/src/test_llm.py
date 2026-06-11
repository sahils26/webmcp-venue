from dotenv import load_dotenv
import os
from pathlib import Path
from mistralai import Mistral

# Load environment variables
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

# Read API key
api_key = os.getenv("MISTRAL_API_KEY")

if not api_key:
    raise ValueError("MISTRAL_API_KEY not found!")

# Create Mistral client
client = Mistral(api_key=api_key)

# Send test request
response = client.chat.complete(
    model="mistral-large-latest",
    messages=[
        {
            "role": "user",
            "content": "Hello"
        }
    ]
)

# Print response
print(response.choices[0].message.content)
