for filepath in [
    '/home/ballhog/cblue-platform/apps/web/app/[locale]/fixers/page.tsx',
    '/home/ballhog/cblue-platform/apps/web/app/[locale]/components/FixerResults.tsx',
]:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    old = '= \u0e3f{it.total.toLocaleString()}</span>;'
    new = '= \u0e3f{it!.total.toLocaleString()}</span>;'
    c = content.count(old)
    print(f'{filepath[-30:]}: {c} it.total single-item')
    content = content.replace(old, new)
    
    old2 = '= \u0e3f{item.total.toLocaleString()}</span>;'
    new2 = '= \u0e3f{item!.total.toLocaleString()}</span>;'
    c2 = content.count(old2)
    print(f'  item.total: {c2}')
    content = content.replace(old2, new2)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
print('Done')
