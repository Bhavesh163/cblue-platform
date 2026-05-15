awk '
/targetRole/ {
    print "            } catch { router.push(`/${locale}/dashboard?tab=chat`); }"
    next
}
{ print }
' apps/web/app/\[locale\]/chat/\[id\]/ClientChatPage.tsx > temp.tsx && mv temp.tsx apps/web/app/\[locale\]/chat/\[id\]/ClientChatPage.tsx
