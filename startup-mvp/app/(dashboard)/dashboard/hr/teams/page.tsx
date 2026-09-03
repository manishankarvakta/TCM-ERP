import { getTeams } from "@/app/actions/hr/team.action";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Layers, Users, Building2 } from "lucide-react";

export default async function TeamsPage() {
  const res = await getTeams(undefined, "all");
  const teams = res.teams || [];

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Teams</h2>
          <p className="text-muted-foreground">
            Manage functional teams subordinate to departments.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4 flex items-center space-x-4">
          <Layers className="h-8 w-8 text-primary" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Teams</p>
            <h3 className="text-2xl font-bold">{teams.length}</h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-4">
          <Users className="h-8 w-8 text-green-500" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Assigned Team Members</p>
            <h3 className="text-2xl font-bold">
              {teams.reduce((acc, t) => acc + (t._count?.Employees || 0), 0)}
            </h3>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Directory</CardTitle>
          <CardDescription>
            Functional teams and department relationships.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Team Name</TableHead>
                <TableHead>Parent Department</TableHead>
                <TableHead>Team Lead</TableHead>
                <TableHead className="text-center">Members</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No teams configured in organization.
                  </TableCell>
                </TableRow>
              ) : (
                teams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="font-mono font-medium">{team.code}</TableCell>
                    <TableCell className="font-semibold">{team.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium">
                        {team.Department?.name || "Unassigned"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {team.Lead ? (
                        <div>
                          <p className="font-medium text-sm">{team.Lead.name}</p>
                          <p className="text-xs text-muted-foreground">{team.Lead.designation || "Team Lead"}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-sm">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-medium">{team._count?.Employees || 0}</TableCell>
                    <TableCell>
                      <Badge variant={team.status === "active" ? "default" : "secondary"}>
                        {team.status.toUpperCase()}
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
