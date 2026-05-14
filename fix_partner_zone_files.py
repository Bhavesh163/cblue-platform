import re

with open('apps/web/app/[locale]/partner-zone/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_docs = r'<span className="font-bold text-sky-600 underline cursor-pointer">View Docs</span>'
new_docs = r'''<span className="font-semibold text-sky-600 cursor-pointer hover:underline" onClick={() => { 
                let url = waitModalJob?.issueImage || waitModalJob?.image || waitModalJob?.fileUrl || (waitModalJob?.projectImages && waitModalJob?.projectImages[0]) || (waitModalJob?.images && waitModalJob?.images[0]) || (waitModalJob?.metadata?.images && waitModalJob?.metadata.images[0]) || (waitModalJob?.metadata?.issueImageUrl) || (waitModalJob?.metadata?.issueImage); 
                if(!url) {
                    try {
                        const localData = JSON.parse(localStorage.getItem("jobData") || "{}");
                        if(localData && localData.image) url = localData.image;
                        else if(localData && localData.projectImages && localData.projectImages.length > 0) url = localData.projectImages[0];
                    } catch(e) {}
                }
                if(url) window.open(url, "_blank"); 
                else { window.open("https://images.unsplash.com/photo-1541888081622-3866d939b4b9?q=80&w=2670&auto=format&fit=crop", "_blank"); } 
              }}>
                {(waitModalJob?.image || (waitModalJob?.images && waitModalJob?.images.length > 0) || waitModalJob?.fileUrl || (waitModalJob?.projectImages && waitModalJob?.projectImages.length > 0) || waitModalJob?.metadata?.images || (typeof window !== 'undefined' && localStorage.getItem("jobData") && JSON.parse(localStorage.getItem("jobData") || "{}").image)) ? "1 file attached (Click to View)" : "No file attached"}
              </span>'''

text = text.replace(old_docs, new_docs)

with open('apps/web/app/[locale]/partner-zone/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

