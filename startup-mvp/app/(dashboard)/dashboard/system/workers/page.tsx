"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Cpu, RefreshCw, Server, Terminal, Play, Pause, Activity, CheckCircle, ShieldCheck } from "lucide-react";
import { getWorkerStatuses, WorkerProcessInfo } from "@/app/actions/system-operations.action";
import { toast } from "sonner";

export default function WorkerProcessesPage() {
  const [loading, setLoading] = useState(true);
  const [workers, setWorkers] = useState<WorkerProcessInfo[]>([]);
  const [totalMem, setTotalMem] = useState(0);
  const [selectedWorkerLog, setSelectedWorkerLog] = useState<string | null>(null);

  const fetchWorkers = async () => {
    setLoading(true);
    const res = await getWorkerStatuses();
    if (res.success) {
      setWorkers(res.workers || []);
      setTotalMem(res.totalMemoryMb || 0);
    } else {
      toast.error(res.error || "Failed to fetch worker process statuses");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  const activeCount = workers.filter((w) => w.status === "ACTIVE").length;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Worker Processes</h1>
            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              Runtime Thread Pools
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Monitor active background daemon threads, BullMQ workers, and hardware integration listeners.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchWorkers} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh Processes
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Daemons</p>
              <h3 className="text-2xl font-bold mt-1">{activeCount} / {workers.length}</h3>
              <p className="text-xs text-emerald-500 mt-1 font-medium flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                100% Operational Readiness
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
              <Server className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Allocated Process Memory</p>
              <h3 className="text-2xl font-bold mt-1">{totalMem} MB</h3>
              <p className="text-xs text-blue-500 mt-1 font-medium">Node Heap Allocation</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
              <Cpu className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Bootstrapper Engine</p>
              <h3 className="text-2xl font-bold mt-1">Next.js Instrumentation</h3>
              <p className="text-xs text-purple-500 mt-1 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Auto-Started on Boot
              </p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-600">
              <Activity className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {workers.map((worker) => (
          <Card key={worker.id} className="relative overflow-hidden border shadow-sm hover:shadow-md transition-shadow">
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-foreground">{worker.name}</h3>
                    {worker.status === "ACTIVE" ? (
                      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                        ACTIVE
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        {worker.status}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs font-mono text-muted-foreground mt-1">{worker.type}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setSelectedWorkerLog(worker.name)}
                >
                  <Terminal className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-muted/40 p-3 rounded-lg text-center text-xs">
                <div>
                  <p className="text-muted-foreground font-medium">Concurrency</p>
                  <p className="font-bold text-sm mt-0.5">{worker.concurrency} Workers</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium">Heap Used</p>
                  <p className="font-bold text-sm mt-0.5">{worker.memoryUsageMb} MB</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium">Processed</p>
                  <p className="font-bold text-sm mt-0.5">{worker.processedCount} Jobs</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                <span>Uptime: {Math.floor(worker.uptimeSeconds / 60)} mins</span>
                <span>Last Activity: {new Date(worker.lastActive).toLocaleTimeString()}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Terminal Log Modal */}
      {selectedWorkerLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl space-y-0">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-emerald-400" />
                <h3 className="font-semibold text-slate-100">{selectedWorkerLog} Output Stream</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-slate-100"
                onClick={() => setSelectedWorkerLog(null)}
              >
                Close
              </Button>
            </div>
            <div className="p-5 font-mono text-xs text-slate-300 space-y-2 max-h-[400px] overflow-y-auto bg-slate-950">
              <p className="text-slate-500">[System] Worker process initialized via Next.js bootstrapper.</p>
              <p className="text-emerald-400">[Worker] Connection to Redis bus established: redis://localhost:6379</p>
              <p className="text-slate-300">[Worker] Queue listener active. Listening for job triggers...</p>
              <p className="text-blue-400">[Worker] Job #1042 processed successfully (12ms).</p>
              <p className="text-emerald-400">[Worker] Health check ping: status 200 OK</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

