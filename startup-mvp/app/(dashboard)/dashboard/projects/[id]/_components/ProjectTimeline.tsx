import React, { useMemo } from "react";
import { GanttChart } from "./gantt/GanttChart";
import { GanttNode } from "./gantt/types";
import { addDays, subDays } from "date-fns";

interface ProjectTimelineProps {
    projectId: string;
}

// Temporary Mock Data Generator to demonstrate the 4-level deep hierarchy and dependencies
const generateMockHierarchy = (): GanttNode[] => {
    const today = new Date();
    
    return [
        {
            id: "m1",
            title: "Milestone 1: Foundation",
            type: "milestone",
            startDate: subDays(today, 5),
            endDate: addDays(today, 10),
            progress: 60,
            dependencies: [],
            isExpanded: true,
            children: [
                {
                    id: "i1",
                    title: "Issue: Setup Environment",
                    type: "issue",
                    startDate: subDays(today, 5),
                    endDate: addDays(today, 2),
                    progress: 80,
                    dependencies: [],
                    isExpanded: true,
                    assignee: { name: "John Doe" },
                    children: [
                        {
                            id: "t1",
                            title: "Task: Docker Configuration",
                            type: "task",
                            startDate: subDays(today, 5),
                            endDate: subDays(today, 1),
                            progress: 100,
                            dependencies: [],
                            isExpanded: false,
                            children: []
                        },
                        {
                            id: "t2",
                            title: "Task: CI/CD Pipeline",
                            type: "task",
                            startDate: today,
                            endDate: addDays(today, 2),
                            progress: 30,
                            dependencies: ["t1"], // Depends on Docker Config
                            isExpanded: true,
                            children: [
                                {
                                    id: "st1",
                                    title: "Subtask: Github Actions",
                                    type: "subtask",
                                    startDate: today,
                                    endDate: addDays(today, 1),
                                    progress: 50,
                                    dependencies: [],
                                    isExpanded: false,
                                    children: []
                                }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            id: "m2",
            title: "Milestone 2: Frontend Implementation",
            type: "milestone",
            startDate: addDays(today, 3),
            endDate: addDays(today, 20),
            progress: 0,
            dependencies: ["m1"], // Depends on Milestone 1
            isExpanded: true,
            children: [
                {
                    id: "t3",
                    title: "Task: Dashboard Layout",
                    type: "task",
                    startDate: addDays(today, 3),
                    endDate: addDays(today, 8),
                    progress: 0,
                    dependencies: [],
                    isExpanded: false,
                    assignee: { name: "Alice Smith" },
                    children: []
                },
                {
                    id: "t4",
                    title: "Task: Gantt Chart Component",
                    type: "task",
                    startDate: addDays(today, 8),
                    endDate: addDays(today, 15),
                    progress: 0,
                    dependencies: ["t3"], // Depends on Dashboard Layout
                    isExpanded: false,
                    children: []
                }
            ]
        }
    ];
};

export function ProjectTimeline({ projectId }: ProjectTimelineProps) {
    const data = useMemo(() => generateMockHierarchy(), []);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <GanttChart initialData={data} />
        </div>
    );
}
