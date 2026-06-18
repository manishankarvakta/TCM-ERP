import { NextResponse } from "next/server";

export async function GET(req: Request) {
  return handleCatchAll(req);
}

export async function POST(req: Request) {
  return handleCatchAll(req);
}

async function handleCatchAll(req: Request) {
  const url = new URL(req.url);
  const path = url.pathname;
  
  const headersObj: Record<string, string> = {};
  req.headers.forEach((v, k) => (headersObj[k] = v));
  
  let bodyText = "";
  if (req.method === "POST" || req.method === "PUT") {
    try {
      bodyText = await req.text();
    } catch(e) {}
  }

  console.log(`\n[ADMS:UNKNOWN_ROUTE]`);
  console.log(`Path=${path}`);
  console.log(`Method=${req.method}`);
  console.log(`Search=${url.search}`);
  console.log(`Headers=`, JSON.stringify(headersObj));
  console.log(`Raw Body=`, bodyText);

  return new NextResponse("OK", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
