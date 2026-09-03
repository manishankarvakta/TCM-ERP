import { getPortalProjectDetails } from "@/app/actions/portal.action";
import Link from "next/link";
import React from "react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PortalProjectDetailsPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getPortalProjectDetails(id);

  if (!result.success || !result.project) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-800">
        Error loading project details: {result.error || "Unknown error"}
      </div>
    );
  }

  const project = result.project;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 text-sm text-slate-500">
        <Link href="/portal/projects" className="hover:underline text-teal-600">Projects</Link>
        <span>&gt;</span>
        <span className="truncate">{project.title}</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">{project.title}</h1>
        <p className="text-sm text-slate-500">Project Number: {project.projectNumber || "N/A"}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Milestones */}
          <div className="bg-white shadow sm:rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-medium text-slate-900 mb-4">Milestones</h2>
            <ul className="divide-y divide-slate-200">
              {project.Milestones.map((milestone) => (
                <li key={milestone.id} className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{milestone.title}</p>
                      <p className="text-xs text-slate-500">{milestone.description || "No description"}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-400">Due: {milestone.dueDate ? new Date(milestone.dueDate).toLocaleDateString() : "N/A"}</span>
                      <span className="inline-flex rounded-full bg-slate-100 px-2 text-xs font-semibold leading-5 text-slate-800">
                        {milestone.status}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
              {project.Milestones.length === 0 && (
                <li className="py-4 text-center text-slate-500 text-sm">No milestones found.</li>
              )}
            </ul>
          </div>
        </div>

        {/* Info Sidebar */}
        <div className="space-y-6">
          <div className="bg-white shadow sm:rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-medium text-slate-900 mb-4">Project Information</h2>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-4">
              <div>
                <dt className="text-xs text-slate-500 uppercase font-semibold">Status</dt>
                <dd className="text-sm text-slate-900 font-medium">{project.status}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 uppercase font-semibold">Health</dt>
                <dd className="text-sm text-slate-900 font-medium">{project.health}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 uppercase font-semibold">Start Date</dt>
                <dd className="text-sm text-slate-900">
                  {project.startDate ? new Date(project.startDate).toLocaleDateString() : "N/A"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 uppercase font-semibold">End Date</dt>
                <dd className="text-sm text-slate-900">
                  {project.endDate ? new Date(project.endDate).toLocaleDateString() : "N/A"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
