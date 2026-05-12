#!/bin/bash

# 1. Partner dash - showing Assigned job but user sees "Awaiting Your Confirmation" in active jobs instead of correct status
# 2. Customer dash - showing Assigned but should be next step "Payment"

sed -i 's/Awaiting Your Confirmation/Processing/g' apps/web/app/\[locale\]/fixers/page.tsx
sed -i 's/Review & Accept/Review Job/g' apps/web/app/\[locale\]/fixers/page.tsx

