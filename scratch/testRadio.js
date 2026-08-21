const http = require('http');

const req = http.request('http://localhost:5173/api/yt-upnext?id=rYEDA3JcQqw', { method: 'GET' }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Got ' + json.length + ' tracks from upnext.');
    } catch(e) {
      console.log('Error parsing JSON: ' + e.message);
      console.log('Data: ' + data.substring(0, 100));
    }
  });
});
req.on('error', console.error);
req.end();
