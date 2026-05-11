import re

def remove_requests_tab(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        text = f.read()

    # Remove requests from TABS
    text = re.sub(r'\{ id: \'requests\', label: \'[^\']*\', icon: [^}]+ \},', '', text)
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(text)

remove_requests_tab("app/[locale]/dashboard/page.tsx")
remove_requests_tab("app/[locale]/fixers/page.tsx")

