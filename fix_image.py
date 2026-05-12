import re

with open('apps/web/app/[locale]/fixers/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# I will replace the on-click handler with a fallback to localStorage
# The user wants identical logic. Let's see.

old_span = '''<span className="font-semibold text-sky-600 cursor-pointer hover:underline" onClick={() => { const url = waitModalOrder.image || waitModalOrder.fileUrl || (waitModalOrder.projectImages && waitModalOrder.projectImages[0]) || (waitModalOrder.images && waitModalOrder.images[0]) || (waitModalOrder.metadata?.images && waitModalOrder.metadata.images[0]); if(url) window.open(url, "_blank"); else { alert("No file was uploaded for this order."); } }}>{(waitModalOrder.image || (waitModalOrder.images && waitModalOrder.images.length > 0) || waitModalOrder.fileUrl || (waitModalOrder.projectImages && waitModalOrder.projectImages.length > 0) || waitModalOrder.metadata?.images) ? "1 file attached (Click to View)" : "1 file attached (Click to View)"}</span>'''

new_span = '''<span className="font-semibold text-sky-600 cursor-pointer hover:underline" onClick={() => { 
                let url = waitModalOrder.image || waitModalOrder.fileUrl || (waitModalOrder.projectImages && waitModalOrder.projectImages[0]) || (waitModalOrder.images && waitModalOrder.images[0]) || (waitModalOrder.metadata?.images && waitModalOrder.metadata.images[0]); 
                if(!url) {
                    try {
                        const localData = JSON.parse(localStorage.getItem("jobData") || "{}");
                        if(localData && localData.image) url = localData.image;
                        else if(localData && localData.projectImages && localData.projectImages.length > 0) url = localData.projectImages[0];
                    } catch(e) {}
                }
                if(url) window.open(url, "_blank"); 
                else { alert("No file was uploaded for this order."); } 
              }}>
                {(waitModalOrder.image || (waitModalOrder.images && waitModalOrder.images.length > 0) || waitModalOrder.fileUrl || (waitModalOrder.projectImages && waitModalOrder.projectImages.length > 0) || waitModalOrder.metadata?.images || (typeof window !== 'undefined' && localStorage.getItem("jobData") && JSON.parse(localStorage.getItem("jobData") || "{}").image)) ? "1 file attached (Click to View)" : "1 file attached (Click to View)"}
              </span>'''

text = text.replace(old_span, new_span)

with open('apps/web/app/[locale]/fixers/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

