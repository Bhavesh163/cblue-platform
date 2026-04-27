import json

with open("scripts/all_keywords.json", "r") as f:
    keywords = json.load(f)

print("Keywords loaded.")
