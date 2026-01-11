import React from "react";
import { getClientById } from "../_actions/client.action";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiArrowLeft, FiEdit, FiImage } from "react-icons/fi";
import { format } from "date-fns";
import { notFound } from "next/navigation";

interface ClientDetailsPageProps {
  searchParams: Promise<{
    id?: string;
  }>;
}

export default async function ClientDetailsPage({ searchParams }: ClientDetailsPageProps) {
  const params = await searchParams;
  const clientId = params.id;

  if (!clientId) {
    notFound();
  }

  const result = await getClientById(clientId);

  if (!result.success || !result.client) {
    notFound();
  }

  const client = result.client;
  const clientStatus = client.status || "active";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/admin/clients">
            <FiArrowLeft className="mr-2 h-4 w-4" />
            Back to Clients
          </Link>
        </Button>
        <Button asChild>
          <Link href={`/admin/clients/${client.id}`}>
            <FiEdit className="mr-2 h-4 w-4" />
            Edit Client
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client Details</CardTitle>
          <CardDescription>View complete information about this client</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Side - Details (3 columns) */}
            <div className="lg:col-span-3 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Client Code</label>
                  <p className="text-sm font-medium">{client.clientCode || "-"}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-sm font-medium">{client.name || "-"}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-sm">{client.email}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <p className="text-sm">{client.phone || "-"}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Company</label>
                  <p className="text-sm">{client.company || "-"}</p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Address</label>
                  <p className="text-sm">
                    {client.address || "-"}
                    {client.city && `, ${client.city}`}
                    {client.state && `, ${client.state}`}
                    {client.zip && ` ${client.zip}`}
                    {client.country && `, ${client.country}`}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div>
                    {clientStatus === "trash" ? (
                      <Badge variant="destructive">Trash</Badge>
                    ) : clientStatus === "inactive" ? (
                      <Badge variant="secondary">Inactive</Badge>
                    ) : (
                      <Badge variant="default">Active</Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Created By</label>
                  <p className="text-sm">{client.createdByUser.name || client.createdByUser.email}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Created At</label>
                  <p className="text-sm">{format(new Date(client.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                  <p className="text-sm">{format(new Date(client.updatedAt), "MMM d, yyyy 'at' h:mm a")}</p>
                </div>
              </div>

              {/* Accounting Fields Section */}
              <div>
                <h3 className="text-sm font-semibold mb-4">Accounting Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Accounts Receivable Account</label>
                    {client.chartOfAccount ? (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {client.chartOfAccount.code} - {client.chartOfAccount.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Type: {client.chartOfAccount.type}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm">-</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Image (1 column) */}
            <div className="lg:col-span-1">
              {client.image ? (
                <div className="sticky top-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Client Photo</label>
                    <div className="relative w-full aspect-square rounded-lg border overflow-hidden bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={client.image}
                        alt={client.name || client.email}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="sticky top-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Client Photo</label>
                    <div className="relative w-full aspect-square rounded-lg border bg-muted flex flex-col items-center justify-center gap-2">
                      <FiImage className="h-12 w-12 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">No photo</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

