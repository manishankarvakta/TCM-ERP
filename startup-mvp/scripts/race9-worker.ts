import { createPortalChangeRequest } from "../app/actions/portal.action";

// Setup mock session
function setMockSession(userId: string) {
  (global as Record<string, unknown>).mockSession = {
    user: {
      id: userId,
      email: `${userId}@test.com`,
      name: `Test User ${userId}`,
      role: "client",
    },
  };
}

async function run() {
  const args = process.argv.slice(2);
  const projectId = args[0];
  const title = args[1];
  const description = args[2];
  const idempotencyKey = args[3];
  const userId = args[4];

  setMockSession(userId);

  const attempts = 10;
  const results = [];

  for (let i = 0; i < attempts; i++) {
    try {
      const res = await createPortalChangeRequest({
        projectId,
        title,
        description,
        idempotencyKey,
      });
      results.push(res);
    } catch (e: unknown) {
      results.push({ success: false, error: (e as Error).message });
    }
  }

  // Print results as JSON
  console.log(JSON.stringify({
    pid: process.pid,
    results,
  }));

  process.exit(0);
}

run().catch((e: unknown) => {
  console.error("Worker error:", e);
  process.exit(1);
});
