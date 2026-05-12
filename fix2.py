
with open('update_layout2.py', 'r') as f:
    text = f.read()

text = text.replace("end_val = page_text.find('{/* ===== PARTNER JOBS (Active) ===== */}')", "end_val = page_text.find('/* ===== PARTNER JOBS (Active) ===== */')")

with open('update_layout2.py', 'w') as f:
    f.write(text)
