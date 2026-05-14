import re

with open("apps/web/app/[locale]/dashboard/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Add mockActiveItems state
if 'const [mockActiveItems, setMockActiveItems]' not in text:
    state_anchor = 'const [mockPayments, setMockPayments] = useState<Record<string, boolean>>({});'
    text = text.replace(state_anchor, state_anchor + '\n  const [mockActiveItems, setMockActiveItems] = useState<any[]>([]);')

# 2. Append to mockActiveItems upon payment
pay_anchor = 'setMockPayments(prev => ({...prev, [waitModalOrder.id]: true}));'
pay_add = '''setMockPayments(prev => ({...prev, [waitModalOrder.id]: true}));
                  setMockActiveItems(prev => [...prev, {
                    ...waitModalOrder,
                    actionNeeded: false,
                    step: 7
                  }]);'''
text = text.replace(pay_anchor, pay_add)

# 3. Render ACTIVE_MOCK combined with mockActiveItems
render_active = 'const combinedActive = [...mockActiveItems, ...ACTIVE_MOCK];'
if 'const combinedActive' not in text:
    # Find {ACTIVE_MOCK.map((m, i) => renderActiveCard(m, i))} and change to combinedActive
    # First define combinedActive just before the return
    anchor2 = 'return ('
    text = text.replace(anchor2, render_active + '\n  ' + anchor2)
    # Then replace ACTIVE_MOCK with combinedActive in the Active Jobs section
    text = re.sub(r'ACTIVE_MOCK\.length', r'combinedActive.length', text)
    text = re.sub(r'ACTIVE_MOCK\.map', r'combinedActive.map', text)

with open("apps/web/app/[locale]/dashboard/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

