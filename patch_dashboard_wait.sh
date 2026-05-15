awk '
/if \(item.type === '"'"'meeting_scheduled'"'"'\)/ {
    print "    if (item.type === '"'"'meeting_pending_partner'"'"') {"
    print "      return ("
    print "        <div key={item.id} className=\"bg-white border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4\">"
    print "          <div className=\"flex items-center gap-4\">"
    print "            <div className=\"w-10 h-10 border-2 border-amber-200 border-dashed rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg animate-pulse\">⏳</div>"
    print "            <div>"
    print "              <h3 className=\"font-bold text-gray-900\">{item.title} <span className=\"text-sm font-normal text-gray-500\">· {item.po} · Step 8 of 11</span></h3>"
    print "              <p className=\"text-sm text-gray-600 mt-0.5\">{item.customer} · {item.date}</p>"
    print "              <p className=\"text-xs text-gray-500 mt-1\">Waiting for partner to confirm meeting time...</p>"
    print "            </div>"
    print "          </div>"
    print "          <div className=\"flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0 justify-between sm:justify-end\">"
    print "            <div className=\"text-left sm:text-right flex flex-col gap-1\">"
    print "              <span className=\"font-bold text-gray-900 pr-2\">Budget: {item.budget}</span>"
    print "              <span className=\"text-xs px-2.5 py-1 rounded-full font-bold bg-amber-50 text-amber-700 uppercase self-start sm:self-end w-max\">{item.tier}</span>"
    print "            </div>"
    print "            <div className=\"flex gap-2\">"
    print "              <button disabled className=\"bg-gray-300 text-gray-500 px-5 py-2 rounded-lg text-sm font-bold shadow-sm whitespace-nowrap cursor-not-allowed\">Pending Partner</button>"
    print "            </div>"
    print "          </div>"
    print "        </div>"
    print "      );"
    print "    }"
}
{ print }
' apps/web/app/\[locale\]/dashboard/page.tsx > temp.tsx && mv temp.tsx apps/web/app/\[locale\]/dashboard/page.tsx
