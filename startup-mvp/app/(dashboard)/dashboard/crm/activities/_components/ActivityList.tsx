"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { FiCheckCircle, FiClock } from "react-icons/fi";
// type ActivityType is not defined in schema, it uses String

interface Activity {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  completed: boolean;
  dueDate: Date | null;
  createdAt: Date;
  contact?: { name: string } | null;
  opportunity?: { title: string } | null;
  lead?: { name: string } | null;
}

interface ActivityListProps {
  activities: Activity[];
  onComplete: (id: string) => void;
}

const typeMap: Record<string, string> = {
  call: "Call",
  meeting: "Meeting",
  email: "Email",
  note: "Note",
  task: "Task",
};

export default function ActivityList({ activities, onComplete }: ActivityListProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Related To</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activities.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No activities found.
              </TableCell>
            </TableRow>
          ) : (
            activities.map((activity) => (
              <TableRow key={activity.id}>
                <TableCell>
                  <Badge variant="outline">{typeMap[activity.type] || activity.type}</Badge>
                </TableCell>
                <TableCell className="font-medium">
                  {activity.subject}
                  {activity.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {activity.description}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col text-sm text-muted-foreground">
                    {activity.contact && <span>Contact: {activity.contact.name}</span>}
                    {activity.opportunity && <span>Deal: {activity.opportunity.title}</span>}
                    {activity.lead && <span>Lead: {activity.lead.name}</span>}
                  </div>
                </TableCell>
                <TableCell>
                  {activity.dueDate ? format(new Date(activity.dueDate), "MMM d, yyyy") : "-"}
                </TableCell>
                <TableCell>
                  {activity.completed ? (
                     <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800 hover:bg-green-100">
                       <FiCheckCircle className="h-3 w-3" /> Completed
                     </Badge>
                  ) : (
                     <Badge variant="secondary" className="gap-1">
                       <FiClock className="h-3 w-3" /> Pending
                     </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {!activity.completed && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onComplete(activity.id)}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <FiCheckCircle className="mr-2 h-4 w-4" />
                      Mark Done
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
