"use client";

import { useEffect, useState, useTransition } from "react";
import { getUserCrmMetrics } from "@/app/actions/crm/crm-dashboard.action";
import { FiTrendingUp, FiCheckSquare, FiCalendar, FiUsers, FiAlertCircle, FiPhoneCall, FiCheckCircle, FiFileText, FiTarget, FiUser, FiVideo, FiClock, FiMail, FiFlag, FiExternalLink } from "react-icons/fi";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export function UserDashboard({ isAdmin = false, selectedUserId }: { isAdmin?: boolean; selectedUserId?: string }) {
  const [metrics, setMetrics] = useState<any>(null);
  const [isPending, startTransition] = useTransition();
  const [taskFilter, setTaskFilter] = useState("all");
  const [taskDate, setTaskDate] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [eventDate, setEventDate] = useState("");

  useEffect(() => {
    startTransition(async () => {
      const result = await getUserCrmMetrics(isAdmin, selectedUserId, taskFilter, taskDate, eventFilter, eventDate);
      if (result.success) {
        setMetrics(result.metrics);
      }
    });
  }, [isAdmin, selectedUserId, taskFilter, taskDate, eventFilter, eventDate]);

  if (!metrics && isPending) {
    return <UserDashboardSkeleton />;
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64 border border-dashed rounded-lg bg-muted/10">
        <p className="text-muted-foreground">Failed to load CRM data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tasks Completed Today */}
        <div className="bg-white dark:bg-slate-900 overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl relative group transition-all duration-300 hover:shadow-md hover:-translate-y-1">
            <div className="absolute bottom-0 right-0 p-4 opacity-10 transform translate-x-4 translate-y-4 group-hover:scale-110 transition-transform duration-500">
               <FiCheckCircle className="w-24 h-24 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="p-6 relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 tracking-tight uppercase">Tasks Completed</h3>
                  <div className="h-10 w-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center border border-emerald-100 dark:border-emerald-800/50">
                      <FiCheckCircle className="text-emerald-600 dark:text-emerald-400 h-5 w-5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                        {metrics.tasksCompletedToday}
                    </h2>
                </div>
                <div className="mt-3 flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full w-fit">
                    Today
                </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
        </div>

        {/* Meetings Held Today */}
        <div className="bg-white dark:bg-slate-900 overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl relative group transition-all duration-300 hover:shadow-md hover:-translate-y-1">
             <div className="absolute bottom-0 right-0 p-4 opacity-10 transform translate-x-4 translate-y-4 group-hover:scale-110 transition-transform duration-500">
               <FiCalendar className="w-24 h-24 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="p-6 relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 tracking-tight uppercase">Meetings Held</h3>
                  <div className="h-10 w-10 rounded-full bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center border border-violet-100 dark:border-violet-800/50">
                      <FiCalendar className="text-violet-600 dark:text-violet-400 h-5 w-5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                        {metrics.meetingsHeldToday}
                    </h2>
                </div>
                <div className="mt-3 flex items-center text-xs font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-2.5 py-1 rounded-full w-fit">
                    Today
                </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-violet-500 to-purple-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
        </div>

        {/* Calls Logged Today */}
        <div className="bg-white dark:bg-slate-900 overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl relative group transition-all duration-300 hover:shadow-md hover:-translate-y-1">
             <div className="absolute bottom-0 right-0 p-4 opacity-10 transform translate-x-4 translate-y-4 group-hover:scale-110 transition-transform duration-500">
               <FiPhoneCall className="w-24 h-24 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="p-6 relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 tracking-tight uppercase">Calls Logged</h3>
                  <div className="h-10 w-10 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center border border-amber-100 dark:border-amber-800/50">
                      <FiPhoneCall className="text-amber-600 dark:text-amber-400 h-5 w-5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                        {metrics.callsLoggedToday}
                    </h2>
                </div>
                <div className="mt-3 flex items-center text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-full w-fit">
                    Today
                </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-500 to-orange-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
        </div>

        {/* Active Pipeline Today */}
        <div className="bg-white dark:bg-slate-900 overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl relative group transition-all duration-300 hover:shadow-md hover:-translate-y-1">
             <div className="absolute bottom-0 right-0 p-4 opacity-5 transform translate-x-4 translate-y-4 group-hover:scale-110 transition-transform duration-500">
               <FiTrendingUp className="w-24 h-24 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="p-6 relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 tracking-tight uppercase">Active Pipeline</h3>
                  <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center border border-blue-100 dark:border-blue-800/50">
                      <FiTrendingUp className="text-blue-600 dark:text-blue-400 h-5 w-5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                        {formatCompactCurrency(metrics.myPipelineValue)}
                    </h2>
                </div>
                <div className="mt-3 flex items-center gap-2">
                    <div className="flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-full w-fit">
                        Today
                    </div>
                    <p className="text-xs text-slate-500 font-medium">{metrics.myPipelineCount} Deals</p>
                </div>
                
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Assign Tasks */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[450px] overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <FiCheckSquare className="text-primary" /> Assign Tasks
                      </h3>
                      {(metrics.todayTasks.length > 0 || metrics.overdueTasks.length > 0) && (
                          <Badge className="bg-primary/10 text-primary border-0 rounded-full px-2">
                              {metrics.todayTasks.length + metrics.overdueTasks.length}
                          </Badge>
                      )}
                  </div>
                  <div className="flex items-center gap-2">
                      <Select value={taskFilter} onValueChange={setTaskFilter}>
                        <SelectTrigger className="h-7 text-xs w-[130px]">
                           <SelectValue placeholder="Filter Tasks" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Default (Today & Overdue)</SelectItem>
                          <SelectItem value="missed">Missed / Overdue</SelectItem>
                          <SelectItem value="soon">Follow-Up Soon (7 Days)</SelectItem>
                          <SelectItem value="long">Long Follow-Up (1-3 Mo)</SelectItem>
                          <SelectItem value="custom">Specific Date</SelectItem>
                        </SelectContent>
                      </Select>
                      {taskFilter === "custom" && (
                          <Input 
                            type="date" 
                            className="h-7 text-xs w-[120px]" 
                            value={taskDate} 
                            onChange={(e) => setTaskDate(e.target.value)} 
                            onClick={(e) => {
                                try {
                                    (e.target as HTMLInputElement).showPicker?.();
                                } catch (err) {}
                            }}
                          />
                      )}
                  </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {metrics.overdueTasks.length === 0 && metrics.todayTasks.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center">
                          <div className="h-16 w-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                              <FiCheckSquare className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                          </div>
                          <h4 className="font-bold text-slate-900 dark:text-white">You're all caught up!</h4>
                          <p className="text-sm text-slate-500 mt-1 max-w-[200px]">No tasks assigned or created by you are currently due.</p>
                      </div>
                  ) : (
                      <>
                          {metrics.overdueTasks.map((task: any) => (
                              <div key={`overdue-${task.id}`} className="group flex items-start gap-3 p-3.5 rounded-lg border border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 hover:shadow-sm transition-shadow">
                                  <div className="mt-0.5 flex-shrink-0">
                                      <FiAlertCircle className="text-red-500 dark:text-red-400 h-4 w-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                      <div className="flex items-start justify-between gap-2">
                                          <Link 
                                              href={task.Lead ? `/dashboard/crm/leads/${task.Lead.id}` : task.Opportunity ? `/dashboard/crm/opportunities/${task.Opportunity.id}` : task.Contact ? `/dashboard/crm/contacts/${task.Contact.id}` : `/dashboard/tasks?taskId=${task.id}`} 
                                              className="hover:underline hover:text-primary transition-colors flex-1 flex items-center gap-1.5"
                                          >
                                              <p className="text-sm font-bold text-slate-900 dark:text-slate-50 break-words line-clamp-1">{task.title}</p>
                                              <FiExternalLink className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                          </Link>
                                          {(task.Lead || task.Opportunity || task.Contact) && (
                                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-[18px] bg-white dark:bg-slate-800/50 text-slate-500 shrink-0 font-medium border-slate-200 dark:border-slate-700">
                                                  {task.Lead ? `Lead: ${task.Lead.name}` : task.Opportunity ? `Opp: ${task.Opportunity.title}` : `Contact: ${task.Contact.firstName} ${task.Contact.lastName || ""}`.trim()}
                                              </Badge>
                                          )}
                                      </div>
                                      
                                      <div className="flex flex-col gap-1.5 mt-2">
                                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                                               <FiUser className="w-3 h-3 shrink-0" />
                                               <span className="line-clamp-1">
                                                   {task.User?.name === task.Assignee?.name 
                                                      ? task.User?.name || 'Unknown'
                                                      : `${task.User?.name || 'Unknown'} → ${task.Assignee?.name || 'Unassigned'}`}
                                               </span>
                                          </div>
                                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                             <p className="text-[11px] text-red-600 dark:text-red-400 font-semibold flex items-center gap-1">
                                                <FiCalendar className="w-3 h-3 shrink-0" />
                                                 Overdue by {formatDistanceToNow(new Date(task.dueDate))}
                                             </p>
                                             {task.dueDate && (
                                                 <span className="text-[10px] text-slate-400 font-medium">
                                                     ({format(new Date(task.dueDate), "MMM d, h:mm a")})
                                                 </span>
                                             )}
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          ))}
                          {metrics.todayTasks.map((task: any) => (
                              <div key={`today-${task.id}`} className="group flex items-start gap-3 p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:shadow-sm transition-shadow">
                                  <div className="mt-0.5 flex-shrink-0">
                                      <FiCheckSquare className="text-amber-500 h-4 w-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                      <div className="flex items-start justify-between gap-2">
                                          <Link 
                                              href={task.Lead ? `/dashboard/crm/leads/${task.Lead.id}` : task.Opportunity ? `/dashboard/crm/opportunities/${task.Opportunity.id}` : task.Contact ? `/dashboard/crm/contacts/${task.Contact.id}` : `/dashboard/tasks?taskId=${task.id}`} 
                                              className="hover:underline hover:text-primary transition-colors flex-1 flex items-center gap-1.5"
                                          >
                                              <p className="text-sm font-bold text-slate-900 dark:text-slate-50 break-words line-clamp-1">{task.title}</p>
                                              <FiExternalLink className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                          </Link>
                                          {(task.Lead || task.Opportunity || task.Contact) && (
                                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-[18px] bg-white dark:bg-slate-800/50 text-slate-500 shrink-0 font-medium border-slate-200 dark:border-slate-700">
                                                  {task.Lead ? `Lead: ${task.Lead.name}` : task.Opportunity ? `Opp: ${task.Opportunity.title}` : `Contact: ${task.Contact.firstName} ${task.Contact.lastName || ""}`.trim()}
                                              </Badge>
                                          )}
                                      </div>
                                      
                                      <div className="flex flex-col gap-1.5 mt-2">
                                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                                               <FiUser className="w-3 h-3 shrink-0" />
                                               <span className="line-clamp-1">
                                                   {task.User?.name === task.Assignee?.name 
                                                      ? task.User?.name || 'Unknown'
                                                      : `${task.User?.name || 'Unknown'} → ${task.Assignee?.name || 'Unassigned'}`}
                                               </span>
                                          </div>
                                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                             <p className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1">
                                                <FiCalendar className="w-3 h-3 shrink-0 text-amber-500" />
                                                 Due today {task.dueDate && `at ${format(new Date(task.dueDate), "h:mm a")}`}
                                             </p>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </>
                  )}
              </div>
          </div>

          {/* Card 2: Upcoming Events */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[450px] overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <FiCalendar className="text-primary" /> Upcoming Events
                      </h3>
                       {metrics.upcomingEvents.length > 0 && (
                          <Badge className="bg-primary/10 text-primary border-0 rounded-full px-2">
                              {metrics.upcomingEvents.length}
                          </Badge>
                      )}
                  </div>
                  <div className="flex items-center gap-2">
                      <Select value={eventFilter} onValueChange={setEventFilter}>
                        <SelectTrigger className="h-7 text-xs w-[130px]">
                           <SelectValue placeholder="Filter Events" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Default (Today)</SelectItem>
                          <SelectItem value="missed">Missed / Overdue</SelectItem>
                          <SelectItem value="soon">Follow-Up Soon (7 Days)</SelectItem>
                          <SelectItem value="long">Long Follow-Up (1-3 Mo)</SelectItem>
                          <SelectItem value="custom">Specific Date</SelectItem>
                        </SelectContent>
                      </Select>
                      {eventFilter === "custom" && (
                          <Input 
                            type="date" 
                            className="h-7 text-xs w-[120px]" 
                            value={eventDate} 
                            onChange={(e) => setEventDate(e.target.value)} 
                            onClick={(e) => {
                                try {
                                    (e.target as HTMLInputElement).showPicker?.();
                                } catch (err) {}
                            }}
                          />
                      )}
                  </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {metrics.upcomingEvents.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center">
                          <div className="h-16 w-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                              <FiCalendar className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                          </div>
                          <h4 className="font-bold text-slate-900 dark:text-white">No upcoming events</h4>
                          <p className="text-sm text-slate-500 mt-1 max-w-[200px]">Your schedule is clear. Enjoy the free time!</p>
                      </div>
                  ) : (
                      metrics.upcomingEvents.map((event: any) => {
                          const typeLower = event.type?.toLowerCase() || '';
                          const isCall = typeLower.includes('call');
                          const isEmail = typeLower.includes('email');
                          const isTask = typeLower.includes('task');
                          const isDeadline = typeLower.includes('deadline');
                          const isMeeting = typeLower.includes('meeting') || typeLower.includes('scheduled');
                          const isDone = event.status === 'DONE' || event.status === 'COMPLETED';
                          const isMissed = event.isMissed;
                          
                          const statusColor = isMissed ? 'text-red-500 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/40' 
                                            : isDone ? 'text-gray-500 bg-gray-50 border-gray-200 dark:bg-gray-500/10 dark:border-gray-500/20' 
                                            : isCall ? 'text-emerald-500 bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20' 
                                            : isEmail ? 'text-cyan-500 bg-cyan-50 border-cyan-200 dark:bg-cyan-500/10 dark:border-cyan-500/20'
                                            : isTask ? 'text-amber-500 bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20'
                                            : isDeadline ? 'text-rose-500 bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20'
                                            : 'text-purple-500 bg-purple-50 border-purple-200 dark:bg-purple-500/10 dark:border-purple-500/20'; // Default to meeting/other
                          
                          const titleColor = isMissed ? 'text-red-600 dark:text-red-400 font-black' : isDone ? 'text-slate-500 line-through' : 'text-slate-900 dark:text-slate-50';
                          
                          return (
                          <div key={`event-${event.id}`} className="group flex items-start gap-4 p-3 rounded-lg border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30 hover:shadow-sm transition-shadow">
                              <div className={`h-10 w-10 flex-shrink-0 rounded-md flex flex-col items-center justify-center border ${statusColor}`}>
                                  {isCall ? (
                                      <FiPhoneCall className="h-5 w-5" />
                                  ) : isEmail ? (
                                      <FiMail className="h-5 w-5" />
                                  ) : isTask ? (
                                      <FiCheckSquare className="h-5 w-5" />
                                  ) : isDeadline ? (
                                      <FiFlag className="h-5 w-5" />
                                  ) : (
                                      <FiCalendar className="h-5 w-5" />
                                  )}
                              </div>
                              <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                      <Link href={event.moduleUrl || "/dashboard/crm/activities"} className="hover:underline hover:text-primary transition-colors flex-1 flex items-center gap-1.5">
                                          <p className={`text-sm break-words line-clamp-1 ${titleColor}`}>
                                              {isMissed && <span className="text-red-600 dark:text-red-500 mr-1 font-bold">[MISSED]</span>}
                                              {event.title}
                                          </p>
                                          <FiExternalLink className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                      </Link>
                                  </div>
                                  <div className="flex flex-col gap-1.5 mt-1">
                                      {event.moduleName && (
                                          <div className="text-[11px] font-bold text-primary mb-0.5 flex items-center gap-1">
                                              <span className="w-1.5 h-1.5 rounded-full bg-primary/60 inline-block"></span>
                                              {event.moduleName}
                                          </div>
                                      )}
                                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium whitespace-nowrap overflow-hidden">
                                           <FiUser className="w-3 h-3 shrink-0" />
                                           <span className="truncate">
                                               {event.owner || 'System'} 
                                               {event.assignees?.length > 0 && ` → ${event.assignees.join(', ')}`}
                                           </span>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                         <p className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1">
                                            <FiClock className={`w-3 h-3 shrink-0 ${isDone ? 'text-emerald-500' : isCall ? 'text-blue-500' : 'text-purple-500'}`} />
                                             {format(new Date(event.startTime), "h:mm a")} - {format(new Date(event.endTime), "h:mm a")}
                                         </p>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      )})
                  )}
              </div>
          </div>

          {/* Card 3: Important Notes */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[450px] overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <FiFileText className="text-primary" /> Important Notes
                  </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {metrics.importantNotes?.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center">
                          <div className="h-16 w-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                              <FiFileText className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                          </div>
                          <h4 className="font-bold text-slate-900 dark:text-white">No recent notes</h4>
                          <p className="text-sm text-slate-500 mt-1 max-w-[200px]">Jot down important information to see it here.</p>
                      </div>
                  ) : (
                      metrics.importantNotes?.map((note: any) => (
                           <div key={`note-${note.id}`} className="flex flex-col p-4 rounded-lg border border-amber-100/50 dark:border-amber-900/20 bg-[#FFFDF2] dark:bg-amber-900/5 hover:shadow-sm transition-shadow relative overflow-hidden group">
                              <div className="absolute top-0 right-0 w-8 h-8 overflow-hidden pointer-events-none">
                                   <div className="absolute top-[-10px] right-[-10px] w-6 h-6 bg-amber-200/50 dark:bg-amber-800/20 rotate-45 transform" />
                              </div>
                              
                              <div className="flex items-start justify-between gap-2 pr-4 mb-1">
                                  <Link 
                                      href={note.Lead ? `/dashboard/crm/leads/${note.Lead.id}` : note.Opportunity ? `/dashboard/crm/opportunities/${note.Opportunity.id}` : note.Contact ? `/dashboard/crm/contacts/${note.Contact.id}` : "/dashboard/crm/activities"} 
                                      className="hover:underline group-hover:text-primary transition-colors flex-1"
                                  >
                                      <h4 className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 text-sm">{note.title}</h4>
                                  </Link>
                                  {(note.Lead || note.Opportunity || note.Contact) && (
                                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-[18px] bg-white dark:bg-slate-800/50 text-slate-500 shrink-0 font-medium border-slate-200 dark:border-slate-700">
                                          {note.Lead ? `Lead: ${note.Lead.name}` : note.Opportunity ? `Opp: ${note.Opportunity.title}` : `Contact: ${note.Contact.firstName} ${note.Contact.lastName || ""}`.trim()}
                                      </Badge>
                                  )}
                              </div>

                              <div 
                                  className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 mb-2 prose prose-sm max-w-none dark:prose-invert prose-p:my-0 prose-ul:my-0 prose-li:my-0 [&>p]:mb-1 [&>ul]:list-disc [&>ul]:pl-4"
                                  dangerouslySetInnerHTML={{ __html: note.content || "No content" }}
                              />
                              
                              <div className="mt-auto flex items-center justify-between">
                                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                      {format(new Date(note.createdAt), "MMM d, yyyy")}
                                  </span>
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                                       <FiUser className="w-3 h-3 shrink-0" />
                                       <span className="line-clamp-1">{note.User?.name || 'Unknown'}</span>
                                  </div>
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>

          {/* Card 4: Assigned Leads & Opportunities */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[450px] overflow-hidden">
              <Tabs defaultValue="leads" className="flex-1 flex flex-col min-h-0">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-3 shrink-0">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 px-2">
                          <FiUsers className="text-primary" /> Leads & Opportunities
                      </h3>
                      <TabsList className="bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg w-full grid grid-cols-2">
                          <TabsTrigger value="leads" className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all text-xs font-semibold py-1.5">
                              Assigned Leads
                              {metrics.newAssignedLeads?.length > 0 && (
                                  <Badge className="ml-1.5 px-1 py-0 h-4 min-w-4 flex items-center justify-center bg-primary/10 text-primary border-0 rounded-full text-[10px]">
                                      {metrics.newAssignedLeads.length}
                                  </Badge>
                              )}
                          </TabsTrigger>
                          <TabsTrigger value="opportunities" className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all text-xs font-semibold py-1.5">
                              Opportunities
                              {metrics.newAssignedOpportunities?.length > 0 && (
                                  <Badge className="ml-1.5 px-1 py-0 h-4 min-w-4 flex items-center justify-center bg-primary/10 text-primary border-0 rounded-full text-[10px]">
                                      {metrics.newAssignedOpportunities.length}
                                  </Badge>
                              )}
                          </TabsTrigger>
                      </TabsList>
                  </div>

                  <TabsContent value="leads" className="flex-1 overflow-y-auto p-4 m-0 outline-none space-y-2">
                       {metrics.newAssignedLeads?.length > 0 ? (
                            metrics.newAssignedLeads.map((lead: any) => (
                                <Link key={`lead-${lead.id}`} href={`/dashboard/crm/leads/${lead.id}`} className="block">
                                    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/50 hover:border-primary/50 hover:shadow-sm transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                                                {lead.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h5 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors line-clamp-1">{lead.name}</h5>
                                                <p className="text-xs text-slate-500 font-medium line-clamp-1">{lead.company || "No Company"}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                                                {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))
                       ) : (
                           <div className="h-full flex flex-col items-center justify-center text-center">
                               <FiUsers className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                               <p className="text-sm font-medium text-slate-500">No new leads assigned.</p>
                           </div>
                       )}
                  </TabsContent>

                  <TabsContent value="opportunities" className="flex-1 overflow-y-auto p-4 m-0 outline-none space-y-2">
                       {metrics.newAssignedOpportunities?.length > 0 ? (
                            metrics.newAssignedOpportunities.map((opp: any) => (
                                <Link key={`opp-${opp.id}`} href={`/dashboard/crm/opportunities/${opp.id}`} className="flex items-center justify-between p-3 rounded-lg border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/50 hover:border-primary/50 hover:shadow-sm transition-all group block">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800/50 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-colors">
                                            <FiTarget className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0 pr-2">
                                            <h5 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors line-clamp-1">{opp.title}</h5>
                                            <p className="text-xs text-slate-500 font-medium line-clamp-1">{opp.Client?.name || "Unknown Client"}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                                         <span className="text-xs font-bold text-slate-900 dark:text-white">
                                            {opp.value ? formatCurrency(opp.value) : 'TBD'}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                                            {formatDistanceToNow(new Date(opp.createdAt), { addSuffix: true })}
                                        </span>
                                    </div>
                                </Link>
                            ))
                       ) : (
                           <div className="h-full flex flex-col items-center justify-center text-center">
                               <FiTarget className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                               <p className="text-sm font-medium text-slate-500">No new opportunities.</p>
                           </div>
                       )}
                  </TabsContent>
              </Tabs>
          </div>
      </div>
    </div>
  );
}

function UserDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 h-[142px]">
            <div className="flex justify-between mb-4">
               <Skeleton className="h-4 w-24" />
               <Skeleton className="h-10 w-10 rounded-full" />
            </div>
            <Skeleton className="h-10 w-16 mb-4" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] rounded-xl" />
          <Skeleton className="h-[400px] rounded-xl" />
      </div>
    </div>
  );
}
