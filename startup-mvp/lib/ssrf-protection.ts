import dns from "dns";
import { URL } from "url";

/**
 * Checks if an IPv4 address is in a private, loopback, or link-local range.
 */
export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some(isNaN) || parts.some((p) => p < 0 || p > 255)) {
    return true; // Treat invalid IPv4 as unsafe/private
  }
  
  const [a, b] = parts;
  
  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;
  
  // 10.0.0.0/8 (Private Network)
  if (a === 10) return true;
  
  // 172.16.0.0/12 (Private Network)
  if (a === 172 && b >= 16 && b <= 31) return true;
  
  // 192.168.0.0/16 (Private Network)
  if (a === 192 && b === 168) return true;
  
  // 169.254.0.0/16 (Link-Local)
  if (a === 169 && b === 254) return true;
  
  // 0.0.0.0/8 (Broadcast/Unspecified)
  if (a === 0) return true;
  
  return false;
}

/**
 * Checks if an IPv6 address is in a private, loopback, or link-local range.
 */
export function isPrivateIPv6(ip: string): boolean {
  const cleanIp = ip.toLowerCase().trim();
  
  // Loopback (::1)
  if (cleanIp === "::1" || cleanIp === "0:0:0:0:0:0:0:1") return true;
  
  // Unspecified (::)
  if (cleanIp === "::" || cleanIp === "0:0:0:0:0:0:0:0") return true;
  
  // Unique Local Addresses (fc00::/7)
  if (cleanIp.startsWith("fc") || cleanIp.startsWith("fd")) return true;
  
  // Link-Local (fe80::/10)
  if (cleanIp.startsWith("fe8") || cleanIp.startsWith("fe9") || cleanIp.startsWith("fea") || cleanIp.startsWith("feb")) return true;
  
  // IPv4-mapped IPv6 (::ffff:192.168.1.1)
  if (cleanIp.includes("::ffff:")) {
    const ipv4Part = ip.split("::ffff:")[1];
    if (ipv4Part) return isPrivateIPv4(ipv4Part);
  }
  
  return false;
}

/**
 * Validates a URL and resolves its hostname to check for SSRF risks.
 * Returns the resolved IP and original URL details if safe.
 */
export async function validateAndResolveUrl(urlStr: string): Promise<{
  safeUrl: string;
  ip: string;
  originalHost: string;
}> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlStr);
  } catch {
    throw new Error("Invalid URL format");
  }
  
  // Allow only HTTP and HTTPS
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error(`Unsupported protocol: ${parsedUrl.protocol}`);
  }
  
  // Reject URLs containing credentials
  if (parsedUrl.username || parsedUrl.password) {
    throw new Error("URLs containing credentials are not permitted");
  }
  
  const hostname = parsedUrl.hostname;
  if (!hostname) {
    throw new Error("Host missing in URL");
  }
  
  // Check if hostname is direct IP
  const isIPv4 = /^[0-9.]+$/.test(hostname);
  const isIPv6 = hostname.includes(":");
  
  let resolvedIp = hostname;
  
  if (isIPv4) {
    if (isPrivateIPv4(hostname)) {
      throw new Error(`SSRF Blocked: Private/Loopback IPv4 target: ${hostname}`);
    }
  } else if (isIPv6) {
    // Strip brackets from IPv6 host in URL
    const cleanIPv6 = hostname.replace(/[\[\]]/g, "");
    if (isPrivateIPv6(cleanIPv6)) {
      throw new Error(`SSRF Blocked: Private/Loopback IPv6 target: ${hostname}`);
    }
    resolvedIp = cleanIPv6;
  } else {
    // Resolve DNS
    try {
      const addresses = await dns.promises.resolve(hostname);
      if (!addresses || addresses.length === 0) {
        throw new Error("DNS resolution yielded no addresses");
      }
      
      // Select first resolved address
      const ip = addresses[0];
      const checkIPv6 = ip.includes(":");
      
      if (checkIPv6) {
        if (isPrivateIPv6(ip)) {
          throw new Error(`SSRF Blocked: DNS resolved to private IPv6: ${ip}`);
        }
      } else {
        if (isPrivateIPv4(ip)) {
          throw new Error(`SSRF Blocked: DNS resolved to private IPv4: ${ip}`);
        }
      }
      resolvedIp = ip;
    } catch {
      // Fallback to lookup (handles localhost or system hosts if permitted, though loopback is blocked later)
      try {
        const lookup = await dns.promises.lookup(hostname);
        const ip = lookup.address;
        const checkIPv6 = ip.includes(":");
        
        if (checkIPv6) {
          if (isPrivateIPv6(ip)) {
            throw new Error(`SSRF Blocked: DNS resolved to private IPv6: ${ip}`);
          }
        } else {
          if (isPrivateIPv4(ip)) {
            throw new Error(`SSRF Blocked: DNS resolved to private IPv4: ${ip}`);
          }
        }
        resolvedIp = ip;
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        throw new Error(`SSRF Blocked: DNS lookup failed for ${hostname}: ${errMsg}`);
      }
    }
  }
  
  // Format destination URL with resolved IP to prevent DNS Rebinding
  const originalHost = parsedUrl.host; // Host includes port if specified
  const destUrl = new URL(urlStr);
  destUrl.hostname = resolvedIp.includes(":") ? `[${resolvedIp}]` : resolvedIp;
  
  return {
    safeUrl: destUrl.toString(),
    ip: resolvedIp,
    originalHost,
  };
}

/**
 * Execute a safe fetch that prevents SSRF and DNS Rebinding.
 */
export async function safeFetch(
  urlStr: string,
  options: RequestInit = {}
): Promise<Response> {
  const { safeUrl, originalHost } = await validateAndResolveUrl(urlStr);
  
  const headers = new Headers(options.headers || {});
  headers.set("Host", originalHost);
  
  return fetch(safeUrl, {
    ...options,
    headers,
  });
}
