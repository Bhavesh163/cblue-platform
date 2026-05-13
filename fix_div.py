with open("apps/web/app/[locale]/dashboard/page.tsx", "r") as f:
    text = f.read()

target = """            <div>
              {ACTIVE_MOCK.map((m, i) => renderActiveCard(m, i))}
            </div>
          </div>"""
replacement = """            <div>
              {ACTIVE_MOCK.map((m, i) => renderActiveCard(m, i))}
            </div>
          </div>
        </div>"""

if target in text:
    text = text.replace(target, replacement, 1)
    with open("apps/web/app/[locale]/dashboard/page.tsx", "w") as f:
        f.write(text)
    print("Fixed div!")
else:
    print("Could not find target block")

