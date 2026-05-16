import os, re, json

print("Fixing things...")
# 1. bump rate limits in backend
f = "backend/src/app.module.ts"
if os.path.exists(f):
    with open(f, "r") as file: txt = file.read()
    txt = txt.replace("{ ttl: 60000, limit: 60 }", "{ ttl: 60000, limit: 3000 }")
    with open(f, "w") as file: file.write(txt)

print("Done")
