with open("apps/web/app/[locale]/dashboard/page.tsx", "r") as f:
    text = f.read()

bad_chunk = r"""  const handleOrderClick = (o: any) => { if (o.status && ['MATCHING', 'CREATED', 'PENDING'].includes(o.status.trim().toUpperCase())) window.location.href = `${prefix}/booking/resume/${o.id}`;

  // MOCK CARDS"""

fixed_chunk = r"""  const handleOrderClick = (o: any) => { if (o.status && ['MATCHING', 'CREATED', 'PENDING'].includes(o.status.trim().toUpperCase())) window.location.href = `${prefix}/booking/resume/${o.id}`; else window.location.href = `${prefix}/chat/${o.id}`; };

  // MOCK CARDS"""

if bad_chunk in text:
    text = text.replace(bad_chunk, fixed_chunk)
    # now remove the dangling else at line 702
    text = text.replace(" else window.location.href = `${prefix}/chat/${o.id}`; };", "", 1)
    
    with open("apps/web/app/[locale]/dashboard/page.tsx", "w") as f:
        f.write(text)
    print("Fixed syntax error")
else:
    print("Not found bad chunk")

