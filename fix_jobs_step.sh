awk '
/mockActiveState\.find/ { next }
/const currentStep = stepLookup\?\.step \|\|/ {
    print "                        const currentStep = job.mockStep || (job.status === '"'"'COMPLETED'"'"' ? 12 : 5);"
    next
}
{ print }
' apps/web/app/\[locale\]/fixers/page.tsx > temp.tsx && mv temp.tsx apps/web/app/\[locale\]/fixers/page.tsx
