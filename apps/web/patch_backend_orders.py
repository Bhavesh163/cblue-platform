import re

with open("../../backend/src/modules/order/order.service.ts", "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace(
"""      where: { 
        OR: [
          { userId },
          { fixer: { userId } }
        ]
      },""",
"      where: { userId },"
)

with open("../../backend/src/modules/order/order.service.ts", "w", encoding="utf-8") as f:
    f.write(text)
