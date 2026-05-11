const { storage } = require('../lib/storage');
require('dotenv').config();

async function check() {
  const key = "cmj9sd9xq0000o1010acd1hsq/aquaFlow.ai";
  const exists = await storage.exists(key);
  console.log(`Checking storage for key: ${key}`);
  console.log(`Exists: ${exists}`);
  console.log(`Configured UPLOAD_DIR: ${storage.config.uploadDir}`);
}

check();
