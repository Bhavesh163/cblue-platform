import re

f = "apps/web/app/[locale]/components/FixerResults.tsx"
with open(f, "r") as file: txt = file.read()

txt = txt.replace('const flowSteps: Step[] = ["matching", "select", "po", "notify", "confirm", "payment", "chat", "meeting", "variation", "complete", "rate"];', 'const flowSteps: Step[] = ["matching", "select", "po", "notify", "confirm", "payment", "chat", "meeting", "variation", "complete", "rate"];')
with open(f, "w") as file: file.write(txt)
