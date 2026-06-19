const fs = require('fs');
const path = './startup-mvp/prisma/schema.prisma';
let schema = fs.readFileSync(path, 'utf8');

// Update UnmappedBiometricLog
schema = schema.replace(
  /model UnmappedBiometricLog \{[\s\S]*?\n\}/,
  (match) => {
    if (match.includes('@@unique([deviceSerialNumber, deviceUserId, punchTime])')) return match;
    return match.replace(
      /@@index\(\[createdAt\]\)/,
      "@@index([createdAt])\n  @@unique([deviceSerialNumber, deviceUserId, punchTime])"
    );
  }
);

// Update BiometricRawLog
schema = schema.replace(
  /model BiometricRawLog \{[\s\S]*?\n\}/,
  (match) => {
    if (match.includes('@@unique([deviceSerialNumber, deviceUserId, punchTime])')) return match;
    return match.replace(
      /@@index\(\[syncStatus\]\)/,
      "@@index([syncStatus])\n  @@unique([deviceSerialNumber, deviceUserId, punchTime])"
    );
  }
);

fs.writeFileSync(path, schema);
console.log('Schema updated');
