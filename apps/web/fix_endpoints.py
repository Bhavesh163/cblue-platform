import os
import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace absolute localhost paths with relative API proxy path
    new_content = re.sub(r'http://localhost:3002/api/', r'/api/v1/', content)

    if content != new_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed {filepath}")
    else:
        print(f"No changes in {filepath}")

fix_file('app/[locale]/booking/resume/[id]/page.tsx')
fix_file('app/[locale]/fixers/page.tsx')

