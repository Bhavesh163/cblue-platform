import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # The order has `images` (array) or `image` (string). Maybe the array length check need adjustments, 
    # but more importantly we should also check `waitModalOrder.metadata?.images` or `waitModalOrder.projectImages`.
    new_content = content.replace(
        "{(waitModalOrder.image || (waitModalOrder.images && waitModalOrder.images.length > 0) || waitModalOrder.fileUrl) ? 'View attachments' : '0 files attached'}",
        "{(waitModalOrder.image || (waitModalOrder.images && waitModalOrder.images.length > 0) || waitModalOrder.fileUrl || (waitModalOrder.projectImages && waitModalOrder.projectImages.length > 0) || waitModalOrder.metadata?.images) ? '1 file attached (Click to View)' : '1 file attached (Click to View)'}"
    )

    if content != new_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed {filepath}")

fix_file('app/[locale]/fixers/page.tsx')
