import * as crypto from "crypto";

export function parseWWWAuthenticate(header: string): Record<string, string> {
  const params: Record<string, string> = {};
  const cleanHeader = header.replace(/^Digest\s+/i, "");
  
  // Matches key="value" or key=value
  const regex = /(\w+)\s*=\s*(?:"([^"]*)"|([^,]*))/g;
  let match;
  while ((match = regex.exec(cleanHeader)) !== null) {
    const key = match[1];
    const val = match[2] !== undefined ? match[2] : match[3];
    params[key] = val ? val.trim() : "";
  }
  return params;
}

export function generateDigestHeader(
  method: string,
  uri: string,
  wwwAuthenticate: string,
  username: string,
  password: string,
  nonceCount: number = 1
): string {
  const params = parseWWWAuthenticate(wwwAuthenticate);
  const realm = params.realm || "";
  const nonce = params.nonce || "";
  const qop = params.qop || "";
  const opaque = params.opaque || "";
  const algorithm = params.algorithm || "MD5";

  // Create client nonce
  const cnonce = crypto.randomBytes(8).toString("hex");
  
  // Format nonce count to 8 hex digits, e.g. 00000001
  const nc = nonceCount.toString(16).padStart(8, "0");

  const md5Hash = (text: string) => crypto.createHash("md5").update(text).digest("hex");

  // HA1 = md5(username:realm:password)
  const HA1 = md5Hash(`${username}:${realm}:${password}`);

  // HA2 = md5(method:uri)
  const HA2 = md5Hash(`${method}:${uri}`);

  let response: string;

  if (qop.split(",").map(q => q.trim()).includes("auth")) {
    // response = md5(HA1:nonce:nc:cnonce:qop:HA2)
    response = md5Hash(`${HA1}:${nonce}:${nc}:${cnonce}:auth:${HA2}`);
  } else {
    // response = md5(HA1:nonce:HA2)
    response = md5Hash(`${HA1}:${nonce}:${HA2}`);
  }

  let authHeader = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}"`;
  
  if (qop.split(",").map(q => q.trim()).includes("auth")) {
    authHeader += `, qop="auth", nc=${nc}, cnonce="${cnonce}"`;
  }
  if (opaque) {
    authHeader += `, opaque="${opaque}"`;
  }
  if (algorithm) {
    authHeader += `, algorithm="${algorithm}"`;
  }

  return authHeader;
}
