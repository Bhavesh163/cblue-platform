const fetch = require('node-fetch');
fetch("https://cblue.co.th/api/v1/subscription/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "Suppadesh@yahoo.com", password: "Password123!" })
}).then(async r => {
  const data = await r.json();
  const meRes = await fetch("https://cblue.co.th/api/v1/fixers/me", {
    headers: { "Authorization": `Bearer ${data.auth_token}` }
  });
  console.log("Body:", await meRes.text());
}).catch(console.error);
