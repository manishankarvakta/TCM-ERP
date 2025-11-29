"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { getOrganizations, getOrganizationById } from "../../_actions/organization.action";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import OrganizationsListClient from "./list";
import OrganizationForm from "./form";
import { format } from "date-fns";

export default function Organization() {
  const searchParams = useSearchParams();
  
  const page = parseInt(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";
  const tab = searchParams.get("tab") || "all";
  const editId = searchParams.get("edit");
  const viewId = searchParams.get("view");
  const addMode = searchParams.get("add") === "true";

  const [organizations, setOrganizations] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organizationDetails, setOrganizationDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch organizations list
  useEffect(() => {
    if (addMode || editId || viewId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const status = tab === "trash" ? "trash" : "all";
    
    startTransition(async () => {
      const result = await getOrganizations(page, 10, search, status);
      if (result.success) {
        setOrganizations(result.organizations || []);
        setPagination(result.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        });
      } else {
        setError(result.error || "Failed to load organizations");
      }
      setLoading(false);
    });
  }, [page, search, tab, addMode, editId, viewId, refreshKey]);

  // Fetch organization details for edit/view
  useEffect(() => {
    if (editId || viewId) {
      setLoadingDetails(true);
      startTransition(async () => {
        const result = await getOrganizationById(editId || viewId || "");
        if (result.success && result.organization) {
          setOrganizationDetails(result.organization);
        } else {
          setError(result.error || "Organization not found");
        }
        setLoadingDetails(false);
      });
    } else {
      setOrganizationDetails(null);
    }
  }, [editId, viewId]);

  // If add mode, show create form
  if (addMode) {
    return <OrganizationForm mode="create" />;
  }

  // If edit mode, show edit form
  if (editId) {
    if (loadingDetails) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      );
    }

    if (error || !organizationDetails) {
      return (
        <div className="space-y-6">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              {error || "Organization not found"}
            </p>
          </div>
        </div>
      );
    }

    return (
      <OrganizationForm
        mode="edit"
        initialData={{
          id: organizationDetails.id,
          name: organizationDetails.name,
          details: organizationDetails.details,
          address: organizationDetails.address,
          phone: organizationDetails.phone,
          email: organizationDetails.email,
          website: organizationDetails.website,
          logo: organizationDetails.logo,
          status: organizationDetails.status,
        }}
      />
    );
  }

  // If view mode, show details
  if (viewId) {
    if (loadingDetails) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      );
    }

    if (error || !organizationDetails) {
      return (
        <div className="space-y-6">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              {error || "Organization not found"}
            </p>
          </div>
        </div>
      );
    }

    const org = organizationDetails;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Organization Details</h1>
            <p className="text-sm text-muted-foreground">View organization information</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard/settings?section=organization">Back to List</Link>
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-4">
          <div className="space-y-4 md:col-span-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <p className="text-sm font-medium">{org.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Details</label>
              <p className="text-sm">{org.details || "-"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Address</label>
              <p className="text-sm">{org.address || "-"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Phone</label>
              <p className="text-sm">{org.phone || "-"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-sm">{org.email || "-"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Website</label>
              <p className="text-sm">
                {org.website ? (
                  <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {org.website}
                  </a>
                ) : (
                  "-"
                )}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <p className="text-sm">
                {org.status === "trash" ? "Trash" : org.status === "inactive" ? "Inactive" : "Active"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created By</label>
              <p className="text-sm">{org.creator.name || org.creator.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created At</label>
              <p className="text-sm">{format(new Date(org.createdAt), "MMM d, yyyy")}</p>
            </div>
          </div>
          <div className="md:col-span-1">
            <label className="text-sm font-medium text-muted-foreground">Logo</label>
            <div className="mt-2">
              {org.logo ? (
                <div className="relative w-full aspect-square max-w-[200px] rounded border overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={org.logo}
                    alt={org.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-full aspect-square max-w-[200px] rounded border bg-muted flex items-center justify-center">
                  <span className="text-sm text-muted-foreground">No logo</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show list view
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Organizations</h1>
            <p className="text-sm text-muted-foreground">Manage organizations in your system</p>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Organizations</h1>
          <p className="text-sm text-muted-foreground">Manage organizations in your system</p>
        </div>
        {tab !== "trash" && (
          <Button asChild>
            <Link href="/dashboard/settings?section=organization&add=true">
              <FiPlus className="mr-2 h-4 w-4" />
              Add Organization
            </Link>
          </Button>
        )}
      </div>

      <Tabs defaultValue={tab} className="w-full">
        <TabsList>
          <TabsTrigger value="all" asChild>
            <Link href="/dashboard/settings?section=organization&tab=all&page=1">All Organizations</Link>
          </TabsTrigger>
          <TabsTrigger value="trash" asChild>
            <Link href="/dashboard/settings?section=organization&tab=trash&page=1">Trash</Link>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <OrganizationsListClient
            initialOrganizations={organizations}
            initialPagination={pagination}
            initialSearch={search}
            isTrash={false}
            onRefresh={() => setRefreshKey(prev => prev + 1)}
          />
        </TabsContent>
        <TabsContent value="trash" className="mt-4">
          <OrganizationsListClient
            initialOrganizations={organizations}
            initialPagination={pagination}
            initialSearch={search}
            isTrash={true}
            onRefresh={() => setRefreshKey(prev => prev + 1)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
