import re

with open('apps/web/app/[locale]/fixers/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update mock notifications to match
notifications_mock = """const NOTIFICATIONS_MOCK = [
  ...
]""" # Need to find the exact declaration first.

