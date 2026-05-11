import re

def fix_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        orig = content
        
        # Remove "requests" from TabKey type and useState
        content = re.sub(r' \| "requests"', '', content)
        content = re.sub(r'\|"requests"', '', content)

        # Remove the navigation button for requests
        content = re.sub(r'\{\s*id:\s*"requests"[^}]+(?:,[^}]+)*\},?', '', content, flags=re.MULTILINE)
        content = re.sub(r'\{\s*id:\s*\'requests\'[^}]+(?:,[^}]+)*\},?', '', content, flags=re.MULTILINE)

        if content != orig:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Fixed tabs in {filepath}")
    except Exception as e:
        print(e)

fix_file('app/[locale]/fixers/page.tsx')
fix_file('app/[locale]/dashboard/page.tsx')
