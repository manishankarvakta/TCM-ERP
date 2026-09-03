import { getPortalTickets } from "@/app/actions/portal.action";
import Link from "next/link";
import React from "react";

export default async function PortalSupportPage() {
  const result = await getPortalTickets();

  const tickets = result.success && result.tickets ? result.tickets : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Support Tickets</h1>
          <p className="text-sm text-slate-500">Track and manage your support requests and coverage status</p>
        </div>
      </div>

      <div className="overflow-hidden bg-white shadow sm:rounded-md border border-slate-200">
        <ul className="divide-y divide-slate-200">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link href={`/portal/support/${ticket.id}`} className="block hover:bg-slate-50">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium text-teal-600 font-semibold">
                      [{ticket.ticketNumber}] {ticket.title}
                    </p>
                    <div className="ml-2 flex flex-shrink-0">
                      <p className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        ticket.status === "OPEN" ? "bg-blue-100 text-blue-800" :
                        ticket.status === "RESOLVED" ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-800"
                      }`}>
                        {ticket.status}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-xs text-slate-500 mr-4">
                        Type: {ticket.type}
                      </p>
                      <p className="flex items-center text-xs text-slate-500">
                        Priority: {ticket.priority}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-xs text-slate-400 sm:mt-0">
                      <p>
                        Created: {new Date(ticket.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
          {tickets.length === 0 && (
            <li className="px-4 py-8 text-center text-slate-500">No support tickets found.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
