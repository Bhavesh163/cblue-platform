fetch("https://cblue.co.th/api/v1/subscription/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "invalid", password: "invalid" })
}).then(async r => {
  console.log("Status:", r.status);
  console.log("Headers:", Object.fromEntries(r.headers.entries()));
  console.log("Body:", await r.text());
}).catch(console.error);
