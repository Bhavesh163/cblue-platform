fetch("https://cblue.co.th/api/v1/subscription/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "Suppadesh@yahoo.com", password: "Password123!" })
}).then(async r => {
  console.log("Status:", r.status);
  console.log("Body:", await r.text());
}).catch(console.error);
