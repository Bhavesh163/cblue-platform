import re

with open('apps/web/app/[locale]/layout.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix the broken export syntax
text = re.sub(
    r'export const metadata: Metadata = \{.*?\};\n\}\): Promise<Metadata> \{',
    r'export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {',
    text,
    flags=re.DOTALL
)

with open('apps/web/app/[locale]/layout.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
