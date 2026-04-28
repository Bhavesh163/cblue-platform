const http = require('http');
http.get('http://localhost:3000/en/dashboard', (res) => {
  console.log('Status:', res.statusCode);
});
