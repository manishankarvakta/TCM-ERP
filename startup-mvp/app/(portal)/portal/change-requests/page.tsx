import { getPortalChangeRequests } from "@/app/actions/portal.action";
import React from "react";

export default async function PortalChangeRequestsPage() {
  const result = await getPortalChangeRequests();

  const changeRequests = result.success && result.changeRequests ? result.changeRequests : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Change Requests</h1>
        <p className="text-sm text-slate-500">View scope adjustments, commercial impact assessments, and status updates</p>
      </div>

      <div className="overflow-hidden bg-white shadow sm:rounded-md border border-slate-200">
        <ul className="divide-y divide-slate-200">
          {changeRequests.map((cr) => (
            <li key={cr.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <p className="truncate text-sm font-semibold text-teal-600">
                  [{cr.changeRequestNumber}] {cr.title}
                </p>
                <div className="ml-2 flex flex-shrink-0">
                  <p className="inline-flex rounded-full bg-blue-100 px-2 text-xs font-semibold leading-5 text-blue-800">
                    {cr.status}
                  </p>
                </div>
              </div>
              <div className="mt-2 text-sm text-slate-600">{cr.description}</div>
              <div className="mt-2 sm:flex sm:justify-between text-xs text-slate-400">
                <div className="sm:flex">
                  <p className="mr-4">Proposed Cost: ৳{cr.proposedCost ? Number(cr.proposedCost).toFixed(2) : "0.00"}</p>
                  <p>Proposed Hours: {cr.proposedHours ? Number(cr.proposedHours).toFixed(1) : "0"}</p>
                </div>
                <div className="mt-2 sm:mt-0">
                  Requested: {cr.requestedDate ? new Date(cr.requestedDate).toLocaleDateString() : new Date().toLocaleDateString()}
                </div>
              </div>
            </li>
          ))}
          {changeRequests.length === 0 && (
            <li className="px-4 py-8 text-center text-slate-500">No change requests found.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
