import { getPortalProjects } from "@/app/actions/portal.action";
import Link from "next/link";
import React from "react";

export default async function PortalProjectsPage() {
  const result = await getPortalProjects();

  if (!result.success || !result.projects) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-800">
        Error loading projects: {result.error || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
        <p className="text-sm text-slate-500">View active deliverables, milestones, and project details</p>
      </div>

      <div className="overflow-hidden bg-white shadow sm:rounded-md border border-slate-200">
        <ul className="divide-y divide-slate-200">
          {result.projects.map((project) => (
            <li key={project.id}>
              <Link href={`/portal/projects/${project.id}`} className="block hover:bg-slate-50">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium text-teal-600">
                      {project.title}
                    </p>
                    <div className="ml-2 flex flex-shrink-0">
                      <p className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">
                        {project.status}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-slate-500">
                        Code: {project.projectNumber || "N/A"}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-slate-500 sm:mt-0">
                      <p>
                        Health: <span className="font-semibold">{project.health}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
          {result.projects.length === 0 && (
            <li className="px-4 py-8 text-center text-slate-500">No active projects found.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
