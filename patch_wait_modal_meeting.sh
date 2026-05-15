awk '
/Accept PO/ {
    print "                {waitModalOrder.status === '"'"'MEETING_REQUESTED'"'"' ? '"'"'Confirm Meeting Time'"'"' : '"'"'Accept PO'"'"'}"
    next
}
/const res = await fetch\(`\/api\/v1\/orders\/\$\{waitModalOrder.id\}\/status`/ {
    print "                    if (waitModalOrder.status === '"'"'MEETING_REQUESTED'"'"') {"
    print "                      try {"
    print "                        const d = localStorage.getItem(\"ghis_mock_dyn_req\");"
    print "                        if (d) {"
    print "                          let reqs = JSON.parse(d);"
    print "                          reqs = reqs.map((r: any) => r.id === waitModalOrder.id ? { ...r, type: '"'"'meeting_scheduled'"'"', desc: '"'"'Meeting invitation sent. Partner has confirmed the meeting time. Tap below after the site meeting is complete.'"'"' } : r);"
    print "                          localStorage.setItem(\"ghis_mock_dyn_req\", JSON.stringify(reqs));"
    print "                        }"
    print "                        alert(\"Meeting confirmed!\");"
    print "                        window.location.reload();"
    print "                        return;"
    print "                      } catch(e) {}"
    print "                    }"
    print $0
    next
}
{ print }
' apps/web/app/\[locale\]/fixers/page.tsx > temp.tsx && mv temp.tsx apps/web/app/\[locale\]/fixers/page.tsx
