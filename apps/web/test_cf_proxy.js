const url = "http://api-backend.cblue.co.th/api/v1/health";
fetch(url).then(r => r.text()).then(t => console.log("Success:", t)).catch(e => console.error("Error:", e));
