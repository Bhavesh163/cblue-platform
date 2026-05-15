awk '
/const checkMock = \(\) => \{/ {
    print "    const checkMock = () => {"
    print "      try {"
    print "        const d = localStorage.getItem(\"ghis_mock_dyn_req\"); if (d) setMockDynReqs(JSON.parse(d));"
    print "        const a = localStorage.getItem(\"ghis_mock_active\"); if (a) setMockActiveState(JSON.parse(a));"
    print "      } catch {}"
    print "    };"
    next
}
/const \[mockDynReqs, setMockDynReqs\] = useState/ {
    print "  const [mockDynReqs, setMockDynReqs] = useState<any[]>([]);"
    print "  const [mockActiveState, setMockActiveState] = useState<any[]>([]);"
    next
}
/const currentStep = job\.status === '"'"'COMPLETED'"'"' \? 12 : 5;/ {
    print "                        const stepLookup = mockActiveState.find((x: any) => x.po === job.po);"
    print "                        const currentStep = stepLookup?.step || (job.status === '"'"'COMPLETED'"'"' ? 12 : 5);"
    next
}
{ print }
' apps/web/app/\[locale\]/fixers/page.tsx > temp.tsx && mv temp.tsx apps/web/app/\[locale\]/fixers/page.tsx
