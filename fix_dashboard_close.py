import re
with open("apps/web/app/[locale]/dashboard/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Make it textually correct for 'Customer'
text = text.replace("Partner Dashboard", "Customer Dashboard")
text = text.replace("Our Partner", "Our Customer")
text = text.replace("Manage jobs, requests, chat, earnings, and profile", "Manage jobs, requests, chat, and profile")
text = text.replace("PartnerJobs", "CustomerJobs")
text = text.replace("function PartnerActiveJobs", "function CustomerActiveJobs")
text = text.replace("<PartnerActiveJobs", "<CustomerActiveJobs")

# 3.2 "at job detail, please change the name of customer to be the name of partner and if waiting for partner, it should be Waiting for partner to proceed"
# PartnerActiveJobs => CustomerActiveJobs
# In `new_partner_jobs_map` we had {o.user?.name || "Customer"}. We need it to be Fixer/Partner name. let's just reverse the default.
text = text.replace('{o.user?.name || "Customer"}', '{o.fixer?.alias || o.fixer?.name || "Partner"}')
text = text.replace('Waiting for customer to proceed', 'Waiting for partner to proceed')

# 3.3 "Regarding incoming request, there will be detail format same as that of our partner page but it will be about for customer to proceed processing payment with confirmation to proceed."
# This refers to the Review PO Modal logic.
text = text.replace('Review PO Details', 'Review Draft PO & Proceed to Payment')
text = text.replace('Customer has placed a request for', 'Partner has confirmed the draft PO for')
text = text.replace('Please review the PO details below and accept or decline.', 'Please review the draft PO and proceed to payment simulation to confirm the project.')
text = text.replace('>Accept PO<', '>Proceed to Payment Pill<')

with open("apps/web/app/[locale]/dashboard/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

