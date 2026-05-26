import re

env_file = "../../backend/.env"
with open(env_file, "r") as f:
    text = f.read()

# Replace or add keys
changed = False
if "MAILJET_PUBLIC_KEY=" in text:
    text = re.sub(r'MAILJET_PUBLIC_KEY=.*', 'MAILJET_PUBLIC_KEY="515b1389c9f3ce79b51f58955681dd9c"', text)
    changed = True
else:
    text += '\nMAILJET_PUBLIC_KEY="515b1389c9f3ce79b51f58955681dd9c"\n'

if "MAILJET_PRIVATE_KEY=" in text:
    text = re.sub(r'MAILJET_PRIVATE_KEY=.*', 'MAILJET_PRIVATE_KEY="95e113e56293d977324d710a3067fb15"', text)
else:
    text += 'MAILJET_PRIVATE_KEY="95e113e56293d977324d710a3067fb15"\n'

if "MAILJET_FROM_EMAIL=" in text:
    text = re.sub(r'MAILJET_FROM_EMAIL=.*', 'MAILJET_FROM_EMAIL="noreply@cblue.co.th"', text)
else:
    text += 'MAILJET_FROM_EMAIL="noreply@cblue.co.th"\n'

with open(env_file, "w") as f:
    f.write(text)
