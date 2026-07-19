import React from "react";
import PageGuard from "@/components/permissions/page-guard";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { format, differenceInMinutes } from "date-fns";
import { 
  FiArrowLeft, FiEdit, FiRefreshCw, FiHardDrive, FiMapPin, 
  FiWifi, FiActivity, FiUsers, FiClock,
  FiAlertCircle
} from "react-icons/fi";
import { 
  getDeviceOverview, 
  getDeviceMappedUsers, 
  getDeviceAttendanceLogs,
  getDeviceRawLogs,
  getDeviceSyncLogs,
  getDeviceUnmappedLogs
} from "../_actions/device-details.action";
import { getDeviceSyncCommands } from "../_actions/device-sync.action";
import AdvancedSyncPanel from "../_components/advanced-sync-panel";
import DeviceEmployeesClient from "./_components/device-employees-client";
import DeviceUnmappedClient from "./_components/device-unmapped-client";
import { prisma } from "@/lib/prisma";

// Helper for online status
const isOnline = (lastPingAt: Date | null) => {
  if (!lastPingAt) return false;
  return differenceInMinutes(new Date(), new Date(lastPingAt)) <= 5;
};

interface DeviceDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default async function DeviceDetailsPage({ params }: DeviceDetailsPageProps) {
  const { id } = await params;
  
  const [
    deviceOverview,
    usersResult,
    attendanceResult,
    rawLogsResult,
    syncLogsResult,
    unmappedResult,
    syncCommandsResult,
    activeEmployees
  ] = await Promise.all([
    getDeviceOverview(id),
    getDeviceMappedUsers(id),
    getDeviceAttendanceLogs(id, 20),
    getDeviceRawLogs(id, 10),
    getDeviceSyncLogs(id, 10),
    getDeviceOverview(id).then(res => 
      res.success && res.device ? getDeviceUnmappedLogs(res.device.serialNumber, 10) : { success: false, logs: [] }
    ),
    getDeviceSyncCommands({ deviceId: id, limit: 10 }),
    prisma.employee.findMany({
      where: { status: { in: ["active", "inactive"] } },
      select: { id: true, name: true, employeeCode: true },
      orderBy: { name: 'asc' }
    })
  ]);

  if (!deviceOverview.success || !deviceOverview.device) {
    notFound();
  }

  const device = deviceOverview.device;
  const mappings = (usersResult.success && usersResult.mappings) ? usersResult.mappings : [];
  const attendanceLogs = attendanceResult.success ? attendanceResult.logs : [];
  const rawLogs = rawLogsResult.success ? rawLogsResult.logs : [];
  const syncLogs = syncLogsResult.success ? syncLogsResult.logs : [];
  const unmappedLogs = (unmappedResult.success && unmappedResult.logs) ? unmappedResult.logs : [];
  const syncCommands = syncCommandsResult.success ? (syncCommandsResult as any).commands : [];

  const online = isOnline(device.lastPingAt);

  return (
    <PageGuard permissionKey="hr.biometric.view">
      <div className="space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button variant="outline" size="icon" asChild className="shrink-0 mt-1">
              <Link href="/dashboard/hr/biometric/devices">
                <FiArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">{device.name}</h1>
                <Badge variant={device.isActive ? "default" : "secondary"}>
                  {device.isActive ? "Active" : "Inactive"}
                </Badge>
                <div className="flex items-center gap-1.5 text-sm bg-muted/50 px-2 py-0.5 rounded-full border">
                  <div className={`h-2 w-2 rounded-full ${online ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="font-medium text-muted-foreground">{online ? 'Online' : 'Offline'}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <FiHardDrive className="h-3.5 w-3.5" />
                  SN: {device.serialNumber || "N/A"}
                </span>
                {device.warehouse && (
                  <span className="flex items-center gap-1">
                    <FiMapPin className="h-3.5 w-3.5" />
                    {device.warehouse.name} {device.location ? `(${device.location})` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 self-start md:self-auto">
            <PageGuard permissionKey="hr.biometric.sync" fallback={null}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <FiRefreshCw className="mr-2 h-4 w-4" />
                    Sync Options
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem disabled>Check Device Status</DropdownMenuItem>
                  <DropdownMenuItem disabled>Sync Users to Device</DropdownMenuItem>
                  <DropdownMenuItem disabled>Sync Attendance Logs</DropdownMenuItem>
                  <DropdownMenuItem disabled>Full Sync</DropdownMenuItem>
                  <div className="p-2 text-xs text-muted-foreground text-center border-t mt-1">
                    Coming in next phase
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </PageGuard>

            <Button asChild>
              <Link href={`/dashboard/hr/biometric/devices/${device.id}/edit`}>
                <FiEdit className="mr-2 h-4 w-4" />
                Edit Device
              </Link>
            </Button>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex flex-wrap w-full justify-start h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="unknown-punches">Unknown Punches</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <PageGuard permissionKey="hr.biometric.sync" fallback={null}>
              <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
            </PageGuard>
          </TabsList>

          <div className="mt-6">
            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Mapped Users</CardTitle>
                    <FiUsers className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{device._count.deviceMappings}</div>
                    <p className="text-xs text-muted-foreground mt-1">Active sync mappings</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Last Ping</CardTitle>
                    <FiActivity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">
                      {device.lastPingAt ? format(new Date(device.lastPingAt), "h:mm a") : "Never"}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {device.lastPingAt ? format(new Date(device.lastPingAt), "MMM d, yyyy") : "-"}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
                    <FiRefreshCw className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">
                      {device.lastSyncAt ? format(new Date(device.lastSyncAt), "h:mm a") : "Never"}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {device.lastSyncAt ? format(new Date(device.lastSyncAt), "MMM d, yyyy") : "No automated syncs"}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* EMPLOYEES TAB */}
            <TabsContent value="employees">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Mapped Employees</CardTitle>
                    <CardDescription>Employees currently linked to this physical device.</CardDescription>
                  </div>
                  <Button variant="outline" asChild size="sm">
                    <Link href={`/dashboard/hr/biometric/mapping?deviceId=${device.id}`}>
                      Manage Global Mapping
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  <DeviceEmployeesClient deviceId={device.id} mappings={mappings} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ATTENDANCE TAB */}
            <TabsContent value="attendance">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Recent Attendance Logs</CardTitle>
                    <CardDescription>Latest parsed punches originating from this device.</CardDescription>
                  </div>
                  <Button variant="outline" asChild size="sm">
                    <Link href={`/dashboard/hr/attendance?deviceId=${device.id}`}>
                      View Global Attendance
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {attendanceLogs?.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">
                      <FiClock className="mx-auto h-8 w-8 mb-3 opacity-20" />
                      <p>No attendance records found for this device.</p>
                      <p className="text-xs mt-1">Daily attendance is summarized for payroll. Device-level punches are available in diagnostics.</p>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>Punch Time</TableHead>
                            <TableHead>Source</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {attendanceLogs?.map((log: any) => (
                            <TableRow key={log.id}>
                              <TableCell className="font-medium">{log.employee?.name}</TableCell>
                              <TableCell>{log.employee?.employeeCode || "-"}</TableCell>
                              <TableCell>{format(new Date(log.timestamp), "MMM d, yyyy h:mm a")}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{log.source}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* UNKNOWN PUNCHES TAB */}
            <TabsContent value="unknown-punches">
              <Card>
                <CardHeader>
                  <CardTitle>Unknown Punches</CardTitle>
                  <CardDescription>These punches could not be matched to an employee.</CardDescription>
                </CardHeader>
                <CardContent>
                  <DeviceUnmappedClient 
                    deviceId={device.id}
                    deviceSerialNumber={device.serialNumber || ""}
                    unmappedLogs={unmappedLogs} 
                    employees={activeEmployees} 
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* SETTINGS TAB */}
            <TabsContent value="settings">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Hardware Details</CardTitle>
                    <CardDescription>Device configuration and network settings.</CardDescription>
                  </div>
                  <Button variant="outline" asChild size="sm">
                    <Link href={`/dashboard/hr/biometric/devices/${device.id}/edit`}>
                      <FiEdit className="mr-2 h-4 w-4" />
                      Edit Device
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Vendor</span>
                    <span className="font-medium">{device.vendor}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium">{device.deviceType}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Connection Type</span>
                    <span className="font-medium">{device.connectionType}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Connection Mode</span>
                    <span className="font-medium">{device.connectionMode}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">IP Address</span>
                    <span className="font-medium">{device.ipAddress || "N/A"}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Port</span>
                    <span className="font-medium">{device.port || "N/A"}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Created At</span>
                    <span className="font-medium">{format(new Date(device.createdAt), "MMM d, yyyy")}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* DIAGNOSTICS TAB */}
            <TabsContent value="diagnostics">
              <PageGuard permissionKey="hr.biometric.sync" fallback={null}>
                <Card className="border-destructive/20 shadow-sm mb-6">
                  <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2">
                      <FiAlertCircle className="h-5 w-5" />
                      Advanced Actions
                    </CardTitle>
                    <CardDescription>Manage direct hardware communication and critical sync routines.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AdvancedSyncPanel deviceId={device.id} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Hardware Tasks</CardTitle>
                    <CardDescription>Recent jobs and hardware commands queued for this device.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {syncCommands?.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-4 text-center border rounded">No diagnostic data found.</p>
                    ) : (
                      <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Requested Time</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Requested By</TableHead>
                              <TableHead>Error/Result</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {syncCommands?.map((cmd: any) => (
                              <TableRow key={cmd.id}>
                                <TableCell className="whitespace-nowrap">{format(new Date(cmd.createdAt), "MMM d, h:mm a")}</TableCell>
                                <TableCell><Badge variant="outline">{cmd.commandType}</Badge></TableCell>
                                <TableCell>
                                  <Badge variant={
                                    cmd.status === "COMPLETED" || cmd.status === "ACKNOWLEDGED" ? "default" :
                                    cmd.status === "FAILED" ? "destructive" :
                                    "secondary"
                                  }>
                                    {cmd.status.replace(/_/g, " ")}
                                  </Badge>
                                </TableCell>
                                <TableCell>{cmd.requestedBy?.name || "System"}</TableCell>
                                <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                                  {cmd.errorMessage || cmd.resultText || "-"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Hardware Diagnostics</CardTitle>
                  <CardDescription>Technical punch data received directly from biometric devices.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="raw" className="w-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="raw">System Punches</TabsTrigger>
                      <TabsTrigger value="sync">Sync Activity</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="raw">
                      {rawLogs?.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-4 text-center border rounded">No diagnostic data found.</p>
                      ) : (
                        <div className="rounded-md border overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Time</TableHead>
                                <TableHead>Biometric ID / PIN</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Technical Data</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {rawLogs?.map((log: any) => (
                                <TableRow key={log.id}>
                                  <TableCell className="whitespace-nowrap">
                                    {log.punchTime ? format(new Date(log.punchTime), "MMM d, h:mm a") : "-"}
                                  </TableCell>
                                  <TableCell>{log.deviceUserId || "-"}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{log.syncStatus}</Badge>
                                  </TableCell>
                                  <TableCell className="max-w-[300px] truncate font-mono text-xs text-muted-foreground">
                                    {log.rawData}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="sync">
                      {syncLogs?.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-4 text-center border rounded">No sync activity has been recorded yet.</p>
                      ) : (
                        <div className="rounded-md border overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Sync Time</TableHead>
                                <TableHead>Records</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Initiated By</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {syncLogs?.map((log: any) => (
                                <TableRow key={log.id}>
                                  <TableCell className="whitespace-nowrap">{format(new Date(log.syncTime), "MMM d, h:mm a")}</TableCell>
                                  <TableCell>{log.recordsCount}</TableCell>
                                  <TableCell>
                                    <Badge variant={log.status === "SUCCESS" ? "default" : "destructive"}>
                                      {log.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{log.user?.name || "System"}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
              
              <div className="mt-4 p-4 border rounded-lg bg-card text-sm">
                <h4 className="font-medium mb-1">Developer Notice:</h4>
                <p className="text-muted-foreground">The advanced sync functionality is securely scaffolded and locked behind the `hr.biometric.sync` permission. Exact raw ADMS strings for logs and users are held `PENDING_DEVICE_VERIFICATION` until tested on live MB360 hardware.</p>
              </div>
              </PageGuard>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </PageGuard>
  );
}
