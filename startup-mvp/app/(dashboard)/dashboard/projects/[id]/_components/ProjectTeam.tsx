import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Users } from "lucide-react";

interface ProjectTeamProps {
    projectId: string;
}

export function ProjectTeam({ projectId }: ProjectTeamProps) {
    return (
        <div className="space-y-6">
            <Card className="rounded-xl border border-border/50 shadow-sm bg-card overflow-hidden">
                <CardContent className="p-12">
                    <div className="flex flex-col items-center justify-center text-center space-y-4">
                        <div className="h-16 w-16 bg-purple-500/10 text-purple-600 rounded-full flex items-center justify-center">
                            <Users className="h-8 w-8" />
                        </div>
                        <h2 className="text-2xl font-bold">Team Management</h2>
                        <p className="text-muted-foreground max-w-lg">
                            This workspace module is reserved for assigning employees to the project, setting their specific roles, and managing their access permissions.
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
