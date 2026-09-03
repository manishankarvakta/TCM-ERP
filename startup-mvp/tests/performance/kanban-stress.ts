import { PrismaClient } from "@prisma/client";
import { redis } from "../../lib/redis";
import { performance } from "perf_hooks";

const prisma = new PrismaClient();
const PROJECT_ID = "stress-test-project-" + Date.now();
const USER_ID = "stress-test-user-" + Date.now();

async function runStressTest() {
    console.log("=== KANBAN STRESS TEST INITIATED ===");

    try {
        // 1. Setup Mock User, Client and Project
        const user = await prisma.user.create({
            data: { id: USER_ID, email: `stress_${Date.now()}@test.com`, name: "Stress Tester", password: "hash" }
        });

        let org = await prisma.organization.findFirst();
        if (!org) {
            org = await prisma.organization.create({
                data: { name: "Stress Org", createdBy: USER_ID }
            });
        }

        const CLIENT_ID = "stress-client-" + Date.now();
        const client = await prisma.client.create({
            data: { id: CLIENT_ID, name: "Stress Client", email: `client_${Date.now()}@test.com`, createdBy: USER_ID, organizationId: org.id }
        });

        const project = await prisma.project.create({
            data: { 
                id: PROJECT_ID, 
                title: "Stress Test Project", 
                Owner: { connect: { id: USER_ID } },
                Client: { connect: { id: CLIENT_ID } },
                Organization: { connect: { id: org.id } }
            }
        });

        console.log(`[SETUP] Created Mock Project: ${PROJECT_ID}`);

        // 2. Insert 10k Tasks in Bulk
        console.log("[TEST 1] Seeding 10,000 Tasks...");
        const startSeed = performance.now();
        const tasksToInsert = Array.from({ length: 10000 }).map((_, i) => ({
            title: `Stress Task ${i}`,
            projectId: PROJECT_ID,
            userId: USER_ID,
            status: "todo",
            priority: "medium",
            organizationId: org.id,
        }));

        await prisma.task.createMany({
            data: tasksToInsert
        });
        const endSeed = performance.now();
        console.log(`[RESULT] 10k Tasks Seeded in ${(endSeed - startSeed).toFixed(2)}ms`);

        // 3. Concurrent Mutation Test (Simulating 50 Users dragging tasks simultaneously)
        console.log("[TEST 2] Simulating Concurrent Database Mutations & Redis PubSub...");
        const tasks = await prisma.task.findMany({ where: { projectId: PROJECT_ID }, select: { id: true }, take: 50 });
        
        const startMutate = performance.now();
        
        const promises = tasks.map((task, i) => {
            const newStatus = i % 2 === 0 ? "in_progress" : "done";
            
            // Execute the exact same DB pattern as kanban.action.ts
            return prisma.$transaction(async (tx) => {
                const updated = await tx.task.update({
                    where: { id: task.id },
                    data: { status: newStatus }
                });

                // Simulate exact Redis payload
                await redis.publish(`project:${PROJECT_ID}`, JSON.stringify({
                    type: "TASK_UPDATED",
                    payload: {
                        id: updated.id,
                        status: updated.status,
                        updatedAt: updated.updatedAt
                    }
                }));
            });
        });

        await Promise.all(promises);
        const endMutate = performance.now();
        console.log(`[RESULT] 50 Concurrent DB Transactions + Redis Pub/Sub resolved in ${(endMutate - startMutate).toFixed(2)}ms`);

    } catch (e: any) {
        console.error("[ERROR] Stress test failed:", e.message);
    } finally {
        // Cleanup
        await prisma.project.delete({ where: { id: PROJECT_ID } }).catch(() => {});
        await prisma.user.delete({ where: { id: USER_ID } }).catch(() => {});
        await prisma.$disconnect();
        redis.quit();
        console.log("=== KANBAN STRESS TEST COMPLETE ===");
    }
}

runStressTest();
