"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Activity, RefreshCw, CheckCircle2, Clock, AlertTriangle, Layers, RotateCcw, Trash2, Eye } from "lucide-react";
import { getQueueJobsStats, retryFailedJob, purgeCompletedJobs, QueueJobSummary, SystemJobItem } from "@/app/actions/system-operations.action";
import { toast } from "sonner";

export default function QueueJobsPage() {
  const [loading, setLoading] = useState(true);
  const [queues, setQueues] = useState<QueueJobSummary[]>([]);
  const [jobs, setJobs] = useState<SystemJobItem[]>([]);
  const [selectedQueue, setSelectedQueue] = useState("all");
  const [selectedJob, setSelectedJob] = useState<SystemJobItem | null>(null);

  const fetchTelemetry = async () => {
    setLoading(true);
    const res = await getQueueJobsStats();
    if (res.success) {
      setQueues(res.queues || []);
      setJobs(res.jobs || []);
    } else {
      toast.error(res.error || "Failed to load queue telemetry");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  const handleRetry = async (jobId: string, queueName: string) => {
    const res = await retryFailedJob(jobId, queueName);
    if (res.success) {
      toast.success(res.message);
      fetchTelemetry();
    } else {
      toast.error(res.error);
    }
  };

  const handlePurge = async (queueName: string) => {
    const res = await purgeCompletedJobs(queueName);
    if (res.success) {
      toast.success(res.message);
      fetchTelemetry();
    } else {
      toast.error(res.error);
    }
  };

  const filteredJobs = selectedQueue === "all" 
    ? jobs 
    : jobs.filter(j => j.queueName === selectedQueue);

  const activeCount = queues.reduce((acc, q) => acc + q.activeCount, 0);
  const waitingCount = queues.reduce((acc, q) => acc + q.waitingCount, 0);
  const failedCount = queues.reduce((acc, q) => acc + q.failedCount, 0);
  const completedCount = queues.reduce((acc, q) => acc + q.completedCount, 0);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Queue Jobs & Task Engine</h1>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              Live BullMQ Telemetry
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Monitor and manage async background queue tasks, job retries, and execution workloads.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchTelemetry} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh Telemetry
          </Button>
          <Button variant="destructive" size="sm" onClick={() => handlePurge(selectedQueue)}>
            <Trash2 className="w-4 h-4 mr-2" />
            Purge Completed
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Processing</p>
              <h3 className="text-2xl font-bold mt-1">{activeCount}</h3>
              <p className="text-xs text-blue-500 mt-1 font-medium flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                Worker Threads Executing
              </p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
              <Activity className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Waiting in Queue</p>
              <h3 className="text-2xl font-bold mt-1">{waitingCount}</h3>
              <p className="text-xs text-amber-500 mt-1 font-medium">Scheduled / Delayed</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Completed Jobs</p>
              <h3 className="text-2xl font-bold mt-1">{completedCount}</h3>
              <p className="text-xs text-emerald-500 mt-1 font-medium">100% Success Rate</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Failed Jobs</p>
              <h3 className="text-2xl font-bold mt-1">{failedCount}</h3>
              <p className="text-xs text-rose-500 mt-1 font-medium">Requires Inspection</p>
            </div>
            <div className="p-3 bg-rose-500/10 rounded-xl text-rose-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Filter Tabs */}
      <Tabs defaultValue="all" value={selectedQueue} onValueChange={setSelectedQueue}>
        <div className="flex items-center justify-between">
          <TabsList className="bg-background border p-1">
            <TabsTrigger value="all">All Queues ({jobs.length})</TabsTrigger>
            <TabsTrigger value="webhook-jobs">Webhook Queue</TabsTrigger>
            <TabsTrigger value="ai-jobs">AI Queue</TabsTrigger>
            <TabsTrigger value="biometric-sync-jobs">Biometric Queue</TabsTrigger>
            <TabsTrigger value="email-jobs">Email Queue</TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      {/* Jobs Execution Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                Job Execution Records
              </CardTitle>
              <CardDescription>
                Detailed log of recent asynchronous queue jobs, payloads, and worker states.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold border-y">
                <tr>
                  <th className="px-6 py-3">Job ID</th>
                  <th className="px-6 py-3">Queue Name</th>
                  <th className="px-6 py-3">Job Event Name</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      No queue jobs found for the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                        {job.id.substring(0, 12)}...
                      </td>
                      <td className="px-6 py-4 font-medium">
                        <Badge variant="outline">{job.queueName}</Badge>
                      </td>
                      <td className="px-6 py-4 font-semibold text-foreground">
                        {job.name}
                      </td>
                      <td className="px-6 py-4">
                        {job.status === "completed" && (
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                            Completed
                          </Badge>
                        )}
                        {job.status === "waiting" && (
                          <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">
                            Waiting
                          </Badge>
                        )}
                        {job.status === "active" && (
                          <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 animate-pulse">
                            Active
                          </Badge>
                        )}
                        {job.status === "failed" && (
                          <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30">
                            Failed
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {new Date(job.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSelectedJob(job)}
                        >
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary"
                          onClick={() => handleRetry(job.id, job.queueName)}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payload Inspection Modal */}
      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              Job Payload Inspection
            </DialogTitle>
            <DialogDescription>
              Detailed JSON payload for Job ID: {selectedJob?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm">
              <span className="text-muted-foreground">Event Type:</span>
              <span className="font-semibold">{selectedJob?.name}</span>
            </div>
            <div className="bg-slate-950 text-slate-50 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-[350px]">
              <pre>{JSON.stringify(selectedJob?.data, null, 2)}</pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

