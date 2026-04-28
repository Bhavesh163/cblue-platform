fetch("http://localhost:3002/api/v1/subscription/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Suppadesh", email: "Suppadesh@yahoo.com", password: "Password123!", phone: "0819852846" })
}).then(async r => {
  console.log("Status:", r.status);
  console.log("Body:", await r.text());
}).catch(console.error);
