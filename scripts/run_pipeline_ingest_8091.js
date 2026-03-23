const http = require('http');

const endpoints = ['/ingest/ocean', '/ingest/fisheries', '/ingest/edna'];

function post(path) {
  return new Promise((resolve) => {
    const req = http.request({ hostname: 'localhost', port: 8091, path, method: 'POST' }, (res) => {
      let data = '';
      res.on('data', (c) => {
        data += c;
      });
      res.on('end', () => {
        console.log(path, res.statusCode, data.slice(0, 400));
        resolve();
      });
    });

    req.on('error', (err) => {
      console.log(path, 'error', err.message);
      resolve();
    });

    req.end();
  });
}

(async () => {
  for (const endpoint of endpoints) {
    await post(endpoint);
    console.log('---');
  }
})();
