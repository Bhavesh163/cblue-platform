import json
import os
import sys

# Add current directory to path so we can import common
sys.path.append(os.getcwd())

try:
    from common.knowledge_base import KNOWLEDGE_BASE
    
    # Create the TS file content
    ts_content = "export const KNOWLEDGE_BASE: Record<string, { keywords: string[], content: string }> = " + json.dumps(KNOWLEDGE_BASE, indent=4, ensure_ascii=False) + ";"
    
    with open('src/data/knowledge_base.ts', 'w', encoding='utf-8') as f:
        f.write(ts_content)
        
    print("Conversion successful!")
except Exception as e:
    print(f"Error: {e}")
