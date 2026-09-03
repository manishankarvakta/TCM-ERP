import { getPortalTicketDetails } from "@/app/actions/portal.action";
import Link from "next/link";
import React from "react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PortalTicketDetailsPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getPortalTicketDetails(id);

  if (!result.success || !result.ticket) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-800">
        Error loading ticket details: {result.error || "Unknown error"}
      </div>
    );
  }

  const ticket = result.ticket;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 text-sm text-slate-500">
        <Link href="/portal/support" className="hover:underline text-teal-600">Support</Link>
        <span>&gt;</span>
        <span className="truncate">{ticket.title}</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          [{ticket.ticketNumber}] {ticket.title}
        </h1>
        <p className="text-sm text-slate-500">Support Entitlement Coverage: <span className="font-semibold text-teal-600">{ticket.coverageStatus}</span></p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Ticket Description and Public Discussion */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white shadow sm:rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-medium text-slate-900 border-b pb-2 mb-4">Ticket Description</h2>
            <div className="text-slate-700 text-sm whitespace-pre-wrap">{ticket.description}</div>
          </div>

          <div className="bg-white shadow sm:rounded-lg border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-medium text-slate-900 border-b pb-2">Public Conversation</h2>
            <ul className="space-y-4">
              {ticket.SupportTicketComments.map((comment) => (
                <li key={comment.id} className="bg-slate-50 rounded-lg p-4">
                  <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                    <span className="font-semibold text-slate-700">
                      {comment.authorUserId ? "Staff Reply" : "Client Contact"}
                    </span>
                    <span>{new Date(comment.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="text-sm text-slate-800">{comment.content}</div>
                </li>
              ))}
              {ticket.SupportTicketComments.length === 0 && (
                <li className="text-center text-slate-400 text-sm py-4">No public replies yet.</li>
              )}
            </ul>
          </div>
        </div>

        {/* SLA and Sidebar */}
        <div className="space-y-6">
          <div className="bg-white shadow sm:rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-medium text-slate-900 mb-4">Ticket Metadata</h2>
            <dl className="grid grid-cols-1 gap-y-4 text-sm">
              <div>
                <dt className="text-xs text-slate-500 uppercase font-semibold">Status</dt>
                <dd className="text-slate-900 font-medium">{ticket.status}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 uppercase font-semibold">Priority</dt>
                <dd className="text-slate-900 font-medium">{ticket.priority}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 uppercase font-semibold">Type</dt>
                <dd className="text-slate-900">{ticket.type}</dd>
              </div>
              {ticket.SupportTicketSLA && (
                <div key={ticket.SupportTicketSLA.id} className="border-t pt-2 mt-2">
                  <dt className="text-xs text-slate-500 uppercase font-semibold">SLA Status</dt>
                  <dd className="text-slate-900 font-semibold text-red-600">{ticket.SupportTicketSLA.status}</dd>
                  <dt className="text-xs text-slate-500 uppercase mt-1">Resolution Target</dt>
                  <dd className="text-xs text-slate-800">
                    {ticket.SupportTicketSLA.resolutionDueAt ? new Date(ticket.SupportTicketSLA.resolutionDueAt).toLocaleString() : "N/A"}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
