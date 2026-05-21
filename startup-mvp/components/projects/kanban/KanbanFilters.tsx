"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface KanbanFiltersProps {
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    priorityFilter: string;
    setPriorityFilter: (val: string) => void;
}

export function KanbanFilters({
    searchQuery,
    setSearchQuery,
    priorityFilter,
    setPriorityFilter
}: KanbanFiltersProps) {
    return (
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border-b bg-muted/20">
            <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search tasks..."
                    className="pl-8 bg-background"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-[180px] bg-background">
                    <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">All Priorities</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
