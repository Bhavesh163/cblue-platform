awk '
/const activeJobs = mappedOrders\.filter\(o => \!.*COMPLETED/ {
    print "  let activeJobs = mappedOrders.filter(o => !['"'"'COMPLETED'"'"', '"'"'CANCELLED'"'"'].includes(o.status));"
    print "  activeJobs = activeJobs.map(job => {"
    print "      const stepLookup = mockActiveState.find((x: any) => x.po === job.po);"
    print "      if (stepLookup) return { ...job, mockStep: stepLookup.step };"
    print "      return job;"
    print "  });"
    next
}
{ print }
' apps/web/app/\[locale\]/fixers/page.tsx > temp.tsx && mv temp.tsx apps/web/app/\[locale\]/fixers/page.tsx
