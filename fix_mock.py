import re

with open("apps/web/app/[locale]/dashboard/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# I accidentally added combinedActive definition inside the useEffect when injecting state_anchor logic.
# Wait, let's fix it by defining combinedActive correctly.

# 1. Remove the bad line from useEffect
bad_line = 'const combinedActive = [...mockActiveItems, ...ACTIVE_MOCK];\n'
text = text.replace(bad_line, '')

# 2. Add it directly below the mockActiveItems useState
text = text.replace('const [mockActiveItems, setMockActiveItems] = useState<any[]>([]);', 'const [mockActiveItems, setMockActiveItems] = useState<any[]>([]);\n  const combinedActive = [...mockActiveItems, ...ACTIVE_MOCK];')

with open("apps/web/app/[locale]/dashboard/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

