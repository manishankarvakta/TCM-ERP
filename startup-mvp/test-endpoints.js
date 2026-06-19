const http = require('http');

async function testEndpoint(path, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3005,
      path: path,
      method: method,
      headers: body ? {
        'Content-Type': 'text/plain',
        'Content-Length': Buffer.byteLength(body)
      } : {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', (e) => resolve({ status: 'ERROR', data: e.message }));
    if (body) req.write(body);
    req.end();
  });
}

async function runTests() {
  console.log("1. GET /iclock/getrequest?SN=UEED252100146");
  console.log(await testEndpoint('/iclock/getrequest?SN=UEED252100146'));

  console.log("\n2. GET /iclock/getrequest (Missing SN)");
  console.log(await testEndpoint('/iclock/getrequest'));

  console.log("\n3. GET /iclock/cdata?SN=UEED252100146");
  console.log(await testEndpoint('/iclock/cdata?SN=UEED252100146'));

  console.log("\n4. POST /iclock/cdata?SN=UEED252100146&table=ATTLOG");
  const attlog = "1001\t2026-06-19 08:30:22\t0\t1\t0\n1002\t2026-06-19 17:01:50\t1\t1\t0";
  console.log(await testEndpoint('/iclock/cdata?SN=UEED252100146&table=ATTLOG', 'POST', attlog));

  console.log("\n5. POST /iclock/devicecmd?SN=UEED252100146");
  console.log(await testEndpoint('/iclock/devicecmd?SN=UEED252100146', 'POST', "ID=100&Return=0&CMD=INFO"));

  process.exit(0);
}
runTests();
