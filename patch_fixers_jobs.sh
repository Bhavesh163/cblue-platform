awk '
/const incomingJobs = mappedOrders\.filter/ {
    print "  const [mockDynReqs, setMockDynReqs] = useState<any[]>([]);"
    print "  useEffect(() => {"
    print "    const checkMock = () => {"
    print "      try { const d = localStorage.getItem(\"ghis_mock_dyn_req\"); if (d) setMockDynReqs(JSON.parse(d)); } catch {}"
    print "    };"
    print "    checkMock();"
    print "    const interval = setInterval(checkMock, 1000);"
    print "    return () => clearInterval(interval);"
    print "  }, []);"
    print ""
    print "  let incomingJobs = mappedOrders.filter(o => ['"'"'CREATED'"'"', '"'"'PENDING'"'"', '"'"'MATCHING'"'"'].includes(o.status));"
    print "  "
    print "  const pendingMeetings = mockDynReqs.filter(r => r.type === '"'"'meeting_pending_partner'"'"').map(r => ({"
    print "    id: r.id,"
    print "    service: r.title,"
    print "    serviceTh: r.title,"
    print "    serviceZh: r.title,"
    print "    customer: r.customer,"
    print "    budget: r.budget?.replace(/[^0-9]/g, '"'"''"'"'),"
    print "    date: r.date,"
    print "    tier: r.tier,"
    print "    po: r.po,"
    print "    status: '"'"'MEETING_REQUESTED'"'"',"
    print "    description: r.desc,"
    print "    mock: true"
    print "  }));"
    print "  incomingJobs = [...pendingMeetings, ...incomingJobs];"
    next
}
{ print }
' apps/web/app/\[locale\]/fixers/page.tsx > temp.tsx && mv temp.tsx apps/web/app/\[locale\]/fixers/page.tsx
