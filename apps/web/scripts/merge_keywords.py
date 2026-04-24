import json
import re

with open('apps/web/app/layout.tsx', 'r') as f:
    content = f.read()

with open('apps/web/scripts/all_keywords.json', 'r') as f:
    new_keywords = json.load(f)

# The keywords array starts at `keywords: [` and ends at `],`
# Let's just find the existing array and replace its contents.
start_idx = content.find("keywords: [")
if start_idx != -1:
    end_idx = content.find("],\n  metadataBase", start_idx)
    if end_idx != -1:
        # Get existing keywords
        array_str = content[start_idx+11:end_idx]
        
        # We can just keep the original stuff and add new keywords at the end of the array, or prepend them.
        # Let's prepend them.
        new_k_str = ",\n    ".join(f'"{k}"' for k in new_keywords)
        
        # Replace the whole keywords array
        new_content = content[:start_idx+11] + "\n    " + new_k_str + ",\n    // Existing keywords below\n" + content[start_idx+11:]
        
        with open('apps/web/app/layout.tsx', 'w') as f2:
            f2.write(new_content)
        print("Success")
    else:
        print("Could not find end of keywords array")
else:
    print("Could not find keywords array")

