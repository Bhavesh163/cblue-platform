import re

with open('apps/web/app/[locale]/partner-zone/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix type errors in line 406 and around that area where waitModalJob is not typed with any.
# Let's replace occurrences of waitModalJob?.image and similar with (waitModalJob as any)?.image
text = text.replace('waitModalJob?.image', '(waitModalJob as any)?.image')
text = text.replace('waitModalJob?.fileUrl', '(waitModalJob as any)?.fileUrl')
text = text.replace('waitModalJob?.projectImages', '(waitModalJob as any)?.projectImages')
text = text.replace('waitModalJob?.images', '(waitModalJob as any)?.images')
text = text.replace('waitModalJob?.metadata', '(waitModalJob as any)?.metadata')

with open('apps/web/app/[locale]/partner-zone/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

