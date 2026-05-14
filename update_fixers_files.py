import re

with open('apps/web/app/[locale]/fixers/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# We replace the text inside the uploaded files button:
old_text = r'''{(waitModalOrder.image || (waitModalOrder.images && waitModalOrder.images.length > 0) || waitModalOrder.fileUrl || (waitModalOrder.projectImages && waitModalOrder.projectImages.length > 0) || waitModalOrder.metadata?.images || (typeof window !== 'undefined' && localStorage.getItem("jobData") && JSON.parse(localStorage.getItem("jobData") || "{}").image)) ? "1 file attached (Click to View)" : "1 file attached (Click to View)"}'''
new_text = r'''{(waitModalOrder?.image || (waitModalOrder?.images && waitModalOrder?.images.length > 0) || waitModalOrder?.fileUrl || (waitModalOrder?.projectImages && waitModalOrder?.projectImages.length > 0) || waitModalOrder?.metadata?.images || (typeof window !== 'undefined' && localStorage.getItem("jobData") && JSON.parse(localStorage.getItem("jobData") || "{}").image)) ? "1 file attached (Click to View)" : "No file attached"}'''

text = text.replace(old_text, new_text)

with open('apps/web/app/[locale]/fixers/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

