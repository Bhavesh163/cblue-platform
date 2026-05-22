import re

def fix_file(filepath, span_pattern_pairs, reduce_pattern=None):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if reduce_pattern:
        old, new = reduce_pattern
        count = content.count(old)
        print(f"reduce ({filepath.split('/')[-1]}): {count}")
        content = content.replace(old, new)
    
    for old, new in span_pattern_pairs:
        count = content.count(old)
        print(f"  pattern ({count}): {old[:60]!r}")
        content = content.replace(old, new)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# Fix fixers/page.tsx
fp = '/home/ballhog/cblue-platform/apps/web/app/[locale]/fixers/page.tsx'
fix_file(fp, [
    # Fix 'it' possibly undefined in map - service name span
    ('{i + 1}) {it.service}', '{i + 1}) {it!.service}'),
    # Fix it.qty, it.unit, it.unitRate in amber span
    ('>{it.qty.toLocaleString()} {it.unit} \u00d7 \u0e3f{it.unitRate.toLocaleString()}', '>{it!.qty.toLocaleString()} {it!.unit} \u00d7 \u0e3f{it!.unitRate.toLocaleString()}'),
    # Fix it.total in amber shrink-0 span
    ('shrink-0\">= \u0e3f{it.total.toLocaleString()}</span>', 'shrink-0\">= \u0e3f{it!.total.toLocaleString()}</span>'),
    # Fix sky variants
    ('shrink-0\">= \u0e3f{it.total.toLocaleString()}</span>', 'shrink-0\">= \u0e3f{it!.total.toLocaleString()}</span>'),
    # Fix reduce
    ('bd.reduce((s, it) => s + it.total, 0)', 'bd.reduce((s, it) => s + (it?.total ?? 0), 0)'),
    # Fix priceList not found in PartnerRequests - need to add priceList prop
], reduce_pattern=None)

print('Done fixers/page.tsx')

# Fix FixerResults.tsx - 'item' possibly undefined
fp2 = '/home/ballhog/cblue-platform/apps/web/app/[locale]/components/FixerResults.tsx'
fix_file(fp2, [
    ('{i + 1}) {item.service}', '{i + 1}) {item!.service}'),
    ('>{item.qty.toLocaleString()} {item.unit} \u00d7 \u0e3f{item.unitRate.toLocaleString()}', '>{item!.qty.toLocaleString()} {item!.unit} \u00d7 \u0e3f{item!.unitRate.toLocaleString()}'),
    ('shrink-0\">= \u0e3f{item.total.toLocaleString()}</span>', 'shrink-0\">= \u0e3f{item!.total.toLocaleString()}</span>'),
    ('bd.reduce((s, item) => s + item.total, 0)', 'bd.reduce((s, item) => s + (item?.total ?? 0), 0)'),
], reduce_pattern=None)
print('Done FixerResults.tsx')
