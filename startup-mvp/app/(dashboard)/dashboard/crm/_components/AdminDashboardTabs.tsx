"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminDashboard } from "./AdminDashboard";
import { UserDashboard } from "./UserDashboard";
import { FiCheckSquare, FiPieChart, FiUser } from "react-icons/fi";

export function AdminDashboardTabs({ users = [] }: { users?: { id: string; name: string | null; email: string; }[] }) {
  const [selectedUserId, setSelectedUserId] = useState<string>("all");

  return (
    <Tabs defaultValue="tasks" className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">CRM Dashboard</h1>
          <p className="text-muted-foreground">
              Overview of your team's sales pipeline and actionable tasks.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <div className="flex items-center gap-2">
                <FiUser className="w-4 h-4 text-muted-foreground" />
                <SelectValue placeholder="All Users" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name || user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <TabsList className="grid w-full sm:w-[400px] grid-cols-2">
            <TabsTrigger value="tasks" className="gap-2">
              <FiCheckSquare className="w-4 h-4" />
              Task Focused
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <FiPieChart className="w-4 h-4" />
              Analytics Focused
            </TabsTrigger>
          </TabsList>
        </div>
      </div>

      <TabsContent value="tasks" className="m-0 border-none p-0 outline-none">
        <UserDashboard isAdmin={true} selectedUserId={selectedUserId} />
      </TabsContent>

      <TabsContent value="analytics" className="m-0 border-none p-0 outline-none">
        <AdminDashboard />
      </TabsContent>
    </Tabs>
  );
}
