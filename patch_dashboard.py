import os, re

f = "apps/web/app/[locale]/dashboard/page.tsx"
if os.path.exists(f):
    with open(f, "r") as file: txt = file.read()
    
    # Overview active jobs to 5
    txt = txt.replace('combinedActive.slice(0, 3).map(', 'combinedActive.slice(0, 5).map(')
    txt = txt.replace('combinedActive.slice(0, 4).map(', 'combinedActive.slice(0, 5).map(')
    
    # Overview incoming requests to 3
    txt = txt.replace('allCombinedRequests.slice(0, 4).map(', 'allCombinedRequests.slice(0, 3).map(')
    txt = txt.replace('allCombinedRequests.slice(0, 2).map(', 'allCombinedRequests.slice(0, 3).map(')

    # Overview incoming chats to 3 latest
    txt = txt.replace('combinedChats.slice(0, 2).map', 'combinedChats.slice(0, 3).map')
    txt = txt.replace('combinedChats.slice(0, 4).map', 'combinedChats.slice(0, 3).map')

    with open(f, "w") as file: file.write(txt)

f2 = "apps/web/app/[locale]/fixers/page.tsx"
if os.path.exists(f2):
    with open(f2, "r") as file: txt = file.read()
    
    # Partner overview active jobs to 5
    txt = txt.replace('combinedActive.slice(0, 3).map(', 'combinedActive.slice(0, 5).map(')
    txt = txt.replace('combinedActive.slice(0, 4).map(', 'combinedActive.slice(0, 5).map(')
    txt = txt.replace('combinedJobs.slice(0, 3).map(', 'combinedJobs.slice(0, 5).map(')
    txt = txt.replace('combinedJobs.slice(0, 4).map(', 'combinedJobs.slice(0, 5).map(')
    
    # Overview incoming requests to 3
    txt = txt.replace('combinedRequests.slice(0, 4).map(', 'combinedRequests.slice(0, 3).map(')
    txt = txt.replace('combinedRequests.slice(0, 2).map(', 'combinedRequests.slice(0, 3).map(')

    with open(f2, "w") as file: file.write(txt)

print("Sliced counts patched.")
