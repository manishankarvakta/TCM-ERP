import { getPortalNotifications } from "@/app/actions/portal.action";
import React from "react";

export default async function PortalNotificationsPage() {
  const result = await getPortalNotifications();

  const notifications = result.success && result.notifications ? result.notifications : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
        <p className="text-sm text-slate-500">Real-time alerts, approvals pending, support updates, and new files shared</p>
      </div>

      <div className="bg-white shadow sm:rounded-lg border border-slate-200 p-6 space-y-4">
        <ul className="divide-y divide-slate-200">
          {notifications.map((notif) => (
            <li key={notif.id} className="py-4 flex justify-between items-start">
              <div>
                <p className={`text-sm font-semibold ${notif.isRead ? "text-slate-600" : "text-slate-900 font-bold"}`}>
                  {notif.title}
                </p>
                <p className="text-sm text-slate-500 mt-1">{notif.message}</p>
                <p className="text-xs text-slate-400 mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
              </div>
              {!notif.isRead && (
                <span className="inline-flex items-center rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800">
                  New
                </span>
              )}
            </li>
          ))}
          {notifications.length === 0 && (
            <li className="py-8 text-center text-slate-400 text-sm">No notifications found.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
