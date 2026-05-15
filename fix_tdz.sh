sed -i '312,323d' apps/web/app/\[locale\]/fixers/page.tsx
awk '
/let activeJobs = mappedOrders\.filter/ {
    print "  const [mockDynReqs, setMockDynReqs] = useState<any[]>([]);"
    print "  const [mockActiveState, setMockActiveState] = useState<any[]>([]);"
    print "  useEffect(() => {"
    print "    const checkMock = () => {"
    print "      try {"
    print "        const d = localStorage.getItem(\"ghis_mock_dyn_req\"); if (d) setMockDynReqs(JSON.parse(d));"
    print "        const a = localStorage.getItem(\"ghis_mock_active\"); if (a) setMockActiveState(JSON.parse(a));"
    print "      } catch {}"
    print "    };"
    print "    checkMock();"
    print "    const interval = setInterval(checkMock, 1000);"
    print "    return () => clearInterval(interval);"
    print "  }, []);"
    print ""
    print $0
    next
}
{ print }
' apps/web/app/\[locale\]/fixers/page.tsx > temp.tsx && mv temp.tsx apps/web/app/\[locale\]/fixers/page.tsx
