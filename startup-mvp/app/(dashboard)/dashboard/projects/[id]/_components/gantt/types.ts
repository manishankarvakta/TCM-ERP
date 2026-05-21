export type GanttNodeType = "milestone" | "issue" | "task" | "subtask";

export interface GanttNode {
    id: string;
    title: string;
    type: GanttNodeType;
    startDate: Date;
    endDate: Date;
    progress: number;
    dependencies: string[]; // Array of IDs this node depends on
    children: GanttNode[];
    isExpanded: boolean;
    assignee?: { name: string; image?: string };
    status?: string;
}
