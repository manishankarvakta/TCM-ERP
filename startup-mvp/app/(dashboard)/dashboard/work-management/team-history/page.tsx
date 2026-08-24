import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllTeamSessionHistory } from "@/app/actions/projects/work-session.action";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, Coffee, CheckCircle, Eye } from "lucide-react";
import PageGuard from "@/components/permissions/page-guard";
import Link from "next/link";
import { format } from "date-fns";

export const metadata = {
  title: "Team Work Logs | TS-CRM",
  description: "Historical registry of daily work sessions and tracked durations.",
};

const statusColorMap: Record<string, { bg: string; text: string; dot: string }> = {
  ACTIVE: {
    bg: "bg-blue-50 dark:bg-blue-950/20",
    text: "text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-900/30",
    dot: "bg-blue-500 animate-pulse",
  },
  BREAK: {
    bg: "bg-amber-50 dark:bg-amber-950/20",
    text: "text-amber-700 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/30",
    dot: "bg-amber-500",
  },
  COMPLETED: {
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    text: "text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/30",
    dot: "bg-emerald-500",
  },
};

export default async function TeamHistoryPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const result = await getAllTeamSessionHistory(1, 100);
  const history = result.success ? result.history : [];

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  return (
    <PageGuard permissionKey="projects.work-management">
      <div className="max-w-full mx-auto space-y-6 px-4 py-2">
        
        {/* Header Title */}
        <div className="flex flex-col gap-1 border-b border-border/40 pb-4">
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            Team Work Logs
          </h1>
          <p className="text-xs text-muted-foreground font-medium">
            Historical overview of employee daily work sessions, active durations, and break timelines.
          </p>
        </div>

        {/* Desktop & Mobile Responsive Table Card */}
        <Card className="border-border/50 bg-card rounded-2xl shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto w-full">
              <Table className="w-full text-xs">
                <TableHeader className="bg-muted/40 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                  <TableRow className="border-b border-border/60 hover:bg-transparent">
                    <TableHead className="p-4 pl-6">Date</TableHead>
                    <TableHead className="p-4">Employee</TableHead>
                    <TableHead className="p-4">Status</TableHead>
                    <TableHead className="p-4"><span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Clock In</span></TableHead>
                    <TableHead className="p-4"><span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Clock Out</span></TableHead>
                    <TableHead className="p-4"><span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Active Hours</span></TableHead>
                    <TableHead className="p-4"><span className="flex items-center gap-1"><Coffee className="h-3 w-3" /> Break Hours</span></TableHead>
                    <TableHead className="p-4 pr-6 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/40 font-medium">
                  {history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="p-12 text-center text-muted-foreground italic">
                        No team work logs found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    history.map((ws: any) => {
                      const statusInfo = statusColorMap[ws.status] || {
                        bg: "bg-slate-50 dark:bg-slate-900/20",
                        text: "text-slate-600 dark:text-slate-400 border-slate-200/50 dark:border-slate-800/30",
                        dot: "bg-slate-400",
                      };

                      const userName = ws.User?.name || "User";
                      const initials = userName
                        ?.split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase() || "?";

                      return (
                        <TableRow key={ws.id} className="hover:bg-muted/10 transition-colors">
                          {/* Date */}
                          <TableCell className="p-4 pl-6 font-bold text-foreground">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              {format(new Date(ws.date), "MMM d, yyyy")}
                            </span>
                          </TableCell>

                          {/* Employee */}
                          <TableCell className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-7 w-7 border shadow-2xs">
                                <AvatarImage src={ws.User?.image} />
                                <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-bold text-foreground truncate max-w-[150px]">{userName}</p>
                                <p className="text-[10px] text-muted-foreground truncate max-w-[150px] font-medium mt-0.5">{ws.User?.email}</p>
                              </div>
                            </div>
                          </TableCell>

                          {/* Status Badge */}
                          <TableCell className="p-4">
                            <Badge variant="outline" className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-lg flex items-center gap-1 w-fit ${statusInfo.bg} ${statusInfo.text}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dot}`} />
                              {ws.status === "ACTIVE" ? "Working" : ws.status === "BREAK" ? "On Break" : "Ended"}
                            </Badge>
                          </TableCell>

                          {/* Clock In */}
                          <TableCell className="p-4 font-mono font-bold text-muted-foreground/80">
                            {ws.startTime ? format(new Date(ws.startTime), "hh:mm a") : "-"}
                          </TableCell>

                          {/* Clock Out */}
                          <TableCell className="p-4 font-mono font-bold text-muted-foreground/80">
                            {ws.endTime ? format(new Date(ws.endTime), "hh:mm a") : "-"}
                          </TableCell>

                          {/* Active Hours */}
                          <TableCell className="p-4 font-mono font-extrabold text-foreground">
                            {formatDuration(ws.totalActiveMs)}
                          </TableCell>

                          {/* Break Hours */}
                          <TableCell className="p-4 font-mono font-bold text-muted-foreground/80">
                            {formatDuration(ws.totalBreakMs)}
                          </TableCell>

                          {/* View Link */}
                          <TableCell className="p-4 pr-6 text-right">
                            <Link href={`/dashboard/work-management/my-day/${ws.User?.id}`}>
                              <Badge variant="secondary" className="cursor-pointer hover:bg-muted text-[10px] font-bold py-1 px-2.5 rounded-lg border flex items-center gap-1.5 w-fit ml-auto">
                                <Eye className="h-3 w-3 text-muted-foreground" /> View Plan
                              </Badge>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

      </div>
    </PageGuard>
  );
}
