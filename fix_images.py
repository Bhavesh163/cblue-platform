import re

with open('apps/web/app/[locale]/chat/[id]/ClientChatPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add a check to load images from localStorage if available
text = re.sub(
    r'(const \[messages, setMessages\] = useState.*?;\n)',
    r'\1  const [localImages, setLocalImages] = useState<string[]>([]);\n  useEffect(() => {\n    const storedData = localStorage.getItem("jobData");\n    if (storedData) {\n      try {\n        const parsed = JSON.parse(storedData);\n        if (parsed.images && parsed.images.length > 0) {\n          setLocalImages(parsed.images);\n        }\n      } catch (e) {}\n    }\n  }, []);\n',
    text
)

img_render = r'(<div className="grid border-2 border-dashed border-gray-200 bg-gray-50/50 rounded-xl min-h-\[160px\] place-items-center mb-6">.*?)(</p>\n\s*</div>\n\s*</div>)'
replacement = r"""
            {localImages.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 mb-6">
                {localImages.map((img, i) => (
                  <img key={i} src={img} alt={`Uploaded ${i+1}`} className="rounded-xl w-full h-40 object-cover border border-gray-200 shadow-sm" />
                ))}
              </div>
            ) : (
              \1\2
            )}
"""

text = re.sub(img_render, replacement, text, flags=re.DOTALL)

with open('apps/web/app/[locale]/chat/[id]/ClientChatPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

