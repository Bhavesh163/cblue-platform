const http = require('http');
http.get('http://localhost:3000/en/fixers', (res) => {
  console.log('Status:', res.statusCode);
});
