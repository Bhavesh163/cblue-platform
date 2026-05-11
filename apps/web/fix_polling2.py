import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = content.replace("if (step >= 4 && initialOrderData?.id) {", "if (step === 'notify' && initialOrderData?.id) {")

    if content != new_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Fixed polling condition")

fix_file('app/[locale]/components/FixerResults.tsx')
