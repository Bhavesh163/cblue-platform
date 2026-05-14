import os, glob

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()

    # Step renames
    text = text.replace('Confirm', 'Accept')
    text = text.replace('Pay', 'Fee & Proceed')
    text = text.replace('Paying fee', 'Fee & Proceed')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(text)

replace_in_file('apps/web/app/[locale]/partner-zone/page.tsx')
replace_in_file('apps/web/app/[locale]/dashboard/page.tsx')
