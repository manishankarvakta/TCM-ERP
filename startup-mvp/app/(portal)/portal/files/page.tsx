import { getPortalFiles } from "@/app/actions/portal.action";
import React from "react";

export default async function PortalFilesPage() {
  const result = await getPortalFiles();

  const files = result.success && result.files ? result.files : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Shared Files & Documents</h1>
        <p className="text-sm text-slate-500">Secure access to project plans, specifications, signed agreements, and invoices</p>
      </div>

      <div className="bg-white shadow sm:rounded-lg border border-slate-200 p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 font-medium text-slate-500">Name</th>
                <th className="px-4 py-2 font-medium text-slate-500">MIME Type</th>
                <th className="px-4 py-2 font-medium text-slate-500">Size</th>
                <th className="px-4 py-2 font-medium text-slate-500">Shared Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {files.map((file) => (
                <tr key={file.shareId}>
                  <td className="px-4 py-3 font-semibold text-slate-900">{file.name}</td>
                  <td className="px-4 py-3 text-slate-500">{file.mimeType}</td>
                  <td className="px-4 py-3 text-slate-500">{(file.size / 1024).toFixed(1)} KB</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(file.sharedAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {files.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">No files shared with your account.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
