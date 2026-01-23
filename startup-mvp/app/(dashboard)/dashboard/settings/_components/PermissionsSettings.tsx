"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiLock, FiPlus, FiUsers } from "react-icons/fi";

export default function PermissionsSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Permissions</h1>
        <p className="text-sm text-muted-foreground">
          Manage user permissions and designation templates
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiLock className="h-5 w-5" />
              Permission Templates
            </CardTitle>
            <CardDescription>
              Create and manage designation templates (Manager, Sales Executive, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/dashboard/settings/permissions/templates">
                <FiLock className="mr-2 h-4 w-4" />
                Manage Templates
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiUsers className="h-5 w-5" />
              User Permissions
            </CardTitle>
            <CardDescription>
              Assign templates and customize permissions for individual users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/users">
                <FiUsers className="mr-2 h-4 w-4" />
                Go to Users
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common permission management tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button asChild variant="outline" className="w-full justify-start">
            <Link href="/dashboard/settings/permissions/templates/new">
              <FiPlus className="mr-2 h-4 w-4" />
              Create New Template
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full justify-start">
            <Link href="/dashboard/users">
              <FiUsers className="mr-2 h-4 w-4" />
              Assign Permissions to Users
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
