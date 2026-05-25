"use server";

import { updateTask } from "@/app/actions/system/task.action";
import { updateIssue, updateMilestone } from "@/app/actions/projects/project.action";

export async function updateClickUpEntity(
  entityType: "task" | "issue" | "milestone",
  id: string,
  updates: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    assigneeId?: string;
    startDate?: Date;
    dueDate?: Date;
  }
) {
  try {
    let result: any = null;

    if (entityType === "task") {
      result = await updateTask(id, updates);
    } else if (entityType === "issue") {
      result = await updateIssue(id, updates);
    } else if (entityType === "milestone") {
      // Milestones do not natively support priority or assigneeId in the Prisma schema
      const milestoneUpdates: any = {
        title: updates.title,
        description: updates.description,
        status: updates.status,
        startDate: updates.startDate,
        dueDate: updates.dueDate,
      };
      
      // Clean undefined keys
      Object.keys(milestoneUpdates).forEach(key => {
        if (milestoneUpdates[key] === undefined) {
          delete milestoneUpdates[key];
        }
      });

      result = await updateMilestone(id, milestoneUpdates);
    }

    if (result?.success) {
      return { success: true };
    } else {
      return { success: false, error: result?.error || "Update failed" };
    }
  } catch (err: any) {
    console.error("updateClickUpEntity error:", err);
    return { success: false, error: err.message };
  }
}
