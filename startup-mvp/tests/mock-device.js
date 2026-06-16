const http = require('http');

const sn = "SN-TEST-1234";
const host = "localhost";
const port = 3000;

console.log("1. Sending ADMS Ping (Handshake)...");
const pingReq = http.request({
  hostname: host,
  port: port,
  path: `/api/iclock/cdata?SN=${sn}`,
  method: 'GET'
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log("Ping Response:", data);
    
    console.log("2. Sending ADMS Data Push...");
    const mockPunch = `42\t2026-06-16 09:15:00\t1\t1\n42\t2026-06-16 18:30:00\t2\t1`;
    
    const pushReq = http.request({
      hostname: host,
      port: port,
      path: `/api/iclock/cdata?SN=${sn}`,
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Content-Length': Buffer.byteLength(mockPunch)
      }
    }, (res2) => {
      let data2 = '';
      res2.on('data', chunk => data2 += chunk);
      res2.on('end', () => {
        console.log("Push Response:", data2);
        console.log("Check the Device Management UI to see the device Online!");
      });
    });
    
    pushReq.on('error', console.error);
    pushReq.write(mockPunch);
    pushReq.end();
  });
});

pingReq.on('error', (err) => {
  console.error("Make sure your Next.js server is running on localhost:3000!");
  console.error(err);
});
pingReq.end();
