import re

with open("app/[locale]/dashboard/page.tsx", "r") as f:
    lines = f.readlines()

data = "".join(lines)
start_idx = data.find('<div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 pb-12 -mt-6">')
if start_idx != -1:
    open_count = 0
    in_jsx = True
    for i in range(start_idx, len(data)):
        if data[i:i+4] == '<div':
            open_count += 1
        elif data[i:i+6] == '</div>':
            open_count -= 1
            if open_count == 0:
                print("Main wrapper closed at line:", data[:i].count('\n') + 1)
            elif open_count < 0:
                print("Extra closing div at line", data[:i].count('\n') + 1)
                open_count = 0
    print("Final open count:", open_count)
