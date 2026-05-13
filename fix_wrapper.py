with open("apps/web/app/[locale]/dashboard/page.tsx", "r") as f:
    text = f.read()

target = """          </div>
        </div>
      </div>
      {waitModalOrder && ("""

replacement = """          </div>
        </div>
      {waitModalOrder && ("""

if target in text:
    text = text.replace(target, replacement, 1)
    with open("apps/web/app/[locale]/dashboard/page.tsx", "w") as f:
        f.write(text)
    print("Fixed wrapper!")
else:
    print("Not found target wrapper")

