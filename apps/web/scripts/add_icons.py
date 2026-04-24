with open('apps/web/app/layout.tsx', 'r') as f:
    content = f.read()

# Check if icons is already there
if "icons:" not in content:
    # Find metadataBase
    idx = content.find("metadataBase: new URL")
    if idx != -1:
        icons_str = """  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/images/favicon-c.png', type: 'image/png' },
    ],
    apple: [
      { url: '/images/favicon-c.png', type: 'image/png' },
    ],
  },
  """
        new_content = content[:idx] + icons_str + content[idx:]
        with open('apps/web/app/layout.tsx', 'w') as f2:
            f2.write(new_content)
        print("Icons added")
    else:
        print("metadataBase not found")
else:
    print("Icons already exists")
