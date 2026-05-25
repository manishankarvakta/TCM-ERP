import React, { useMemo } from "react";
import { GanttNode } from "./types";

interface GanttDependenciesProps {
    data: GanttNode[];
    getBarStyles: (start: Date, end: Date) => { left: number; width: number };
    totalDays: number;
    dayWidth: number;
}

// Flatten visible nodes to calculate Y indices
const getVisibleNodes = (nodes: GanttNode[], result: GanttNode[] = []): GanttNode[] => {
    nodes.forEach(node => {
        result.push(node);
        if (node.isExpanded && node.children) {
            getVisibleNodes(node.children, result);
        }
    });
    return result;
};

export function GanttDependencies({ data, getBarStyles, totalDays, dayWidth }: GanttDependenciesProps) {
    const visibleNodes = useMemo(() => getVisibleNodes(data), [data]);
    const ROW_HEIGHT = 48; // h-12 in Tailwind is 48px

    // Find all links: node depends on X => line from X to node
    const links = useMemo(() => {
        const lines: React.ReactNode[] = [];
        visibleNodes.forEach((node, targetIndex) => {
            if (!node.dependencies || node.dependencies.length === 0) return;
            
            node.dependencies.forEach(depId => {
                const sourceIndex = visibleNodes.findIndex(n => n.id === depId);
                if (sourceIndex === -1) return; // Dep is collapsed or doesn't exist

                const sourceNode = visibleNodes[sourceIndex];
                
                // Calculate coordinates
                const sourceStyles = getBarStyles(sourceNode.startDate, sourceNode.endDate);
                const targetStyles = getBarStyles(node.startDate, node.endDate);

                const sourceLeftPx = sourceStyles.left;
                const sourceWidthPx = sourceStyles.width;
                const targetLeftPx = targetStyles.left;

                const startX = sourceLeftPx + sourceWidthPx;
                const startY = (sourceIndex * ROW_HEIGHT) + (ROW_HEIGHT / 2);
                
                const endX = targetLeftPx;
                const endY = (targetIndex * ROW_HEIGHT) + (ROW_HEIGHT / 2);

                // Draw an orthogonal bezier curve
                const path = `M ${startX} ${startY} C ${startX + 15} ${startY}, ${endX - 15} ${endY}, ${endX} ${endY}`;

                lines.push(
                    <g key={`${depId}-${node.id}`}>
                        <path 
                            d={path} 
                            fill="none" 
                            stroke="#f43f5e" // rose-500
                            strokeWidth="2" 
                            strokeDasharray="4 2"
                            className="opacity-60"
                        />
                        <polygon 
                            points={`${endX},${endY - 4} ${endX + 6},${endY} ${endX},${endY + 4}`} 
                            fill="#f43f5e" 
                            className="opacity-80"
                        />
                    </g>
                );
            });
        });
        return lines;
    }, [visibleNodes, getBarStyles, totalDays, dayWidth]);

    if (links.length === 0) return null;

    return (
        <svg 
            className="absolute top-0 left-0 pointer-events-none z-10" 
            style={{ width: `${totalDays * dayWidth}px`, height: `${visibleNodes.length * ROW_HEIGHT}px` }}
        >
            {links}
        </svg>
    );
}
