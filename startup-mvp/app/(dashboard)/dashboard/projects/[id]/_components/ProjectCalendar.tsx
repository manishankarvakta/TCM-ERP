import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, CalendarDays } from "lucide-react";

interface ProjectCalendarProps {
    projectId: string;
}

export function ProjectCalendar({ projectId }: ProjectCalendarProps) {
    return (
        <div className="space-y-6">
            <Card className="rounded-xl border border-border/50 shadow-sm bg-card overflow-hidden">
                <CardContent className="p-12">
                    <div className="flex flex-col items-center justify-center text-center space-y-4">
                        <div className="h-16 w-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center">
                            <CalendarDays className="h-8 w-8" />
                        </div>
                        <h2 className="text-2xl font-bold">Project Calendar</h2>
                        <p className="text-muted-foreground max-w-lg">
                            This workspace module is reserved for an interactive Calendar showing Tasks, Issues, and Events. A specialized third-party Calendar library (e.g. FullCalendar) can be integrated here.
                        </p>
                        <div className="pt-4 flex items-center gap-2 text-sm text-amber-600 bg-amber-500/10 px-4 py-2 rounded-full font-medium">
                            <Clock className="w-4 h-4" />
                            <span>Module integration pending in next phase</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
