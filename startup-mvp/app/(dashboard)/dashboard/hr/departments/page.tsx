import { getDepartments } from "@/app/actions/hr/department.action";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Layers, ShieldCheck } from "lucide-react";

export default async function DepartmentsPage() {
  const res = await getDepartments("all");
  const departments = res.departments || [];

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Departments</h2>
          <p className="text-muted-foreground">
            Manage organizational departments and department heads.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4 flex items-center space-x-4">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Departments</p>
            <h3 className="text-2xl font-bold">{departments.length}</h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-4">
          <Users className="h-8 w-8 text-green-500" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Assigned Employees</p>
            <h3 className="text-2xl font-bold">
              {departments.reduce((acc, d) => acc + (d._count?.Employees || 0), 0)}
            </h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-4">
          <Layers className="h-8 w-8 text-blue-500" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Sub-Teams</p>
            <h3 className="text-2xl font-bold">
              {departments.reduce((acc, d) => acc + (d._count?.Teams || 0), 0)}
            </h3>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Department Directory</CardTitle>
          <CardDescription>
            Active organizational units and assigned management heads.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Department Name</TableHead>
                <TableHead>Department Manager</TableHead>
                <TableHead className="text-center">Employees</TableHead>
                <TableHead className="text-center">Teams</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No departments found in organization.
                  </TableCell>
                </TableRow>
              ) : (
                departments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-mono font-medium">{dept.code}</TableCell>
                    <TableCell className="font-semibold">{dept.name}</TableCell>
                    <TableCell>
                      {dept.Manager ? (
                        <div>
                          <p className="font-medium text-sm">{dept.Manager.name}</p>
                          <p className="text-xs text-muted-foreground">{dept.Manager.designation || "Department Head"}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-sm">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-medium">{dept._count?.Employees || 0}</TableCell>
                    <TableCell className="text-center font-medium">{dept._count?.Teams || 0}</TableCell>
                    <TableCell>
                      <Badge variant={dept.status === "active" ? "default" : "secondary"}>
                        {dept.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
