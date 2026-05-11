import re

with open("apps/web/app/[locale]/partner-zone/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Add state to PartnerDashboard
if 'const [waitModalOrder, setWaitModalOrder] = useState<any>(null);' not in text:
    text = text.replace(
        'export default function PartnerDashboard() {',
        'export default function PartnerDashboard() {\n  const [waitModalOrder, setWaitModalOrder] = useState<any>(null);\n  const [detailModalOrder, setDetailModalOrder] = useState<any>(null);'
    )

# Replace the generic button labels inside requests tab to trigger modals
text = text.replace('onClick={() => { /* Accept logic */ }}', 'onClick={() => setDetailModalOrder(req)}')
text = text.replace('onClick={() => { /* Decline logic */ }}', '')

with open("apps/web/app/[locale]/partner-zone/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)
