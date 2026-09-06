import { Suspense } from "react";
import { AppointmentLetterList } from "./_components/appointment-letter-list";
import { FiFileText } from "react-icons/fi";

export const metadata = {
  title: "Appointment Letters | HR & Payroll",
  description: "Generate and manage employee appointment letters",
};

export default function AppointmentLettersPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <FiFileText className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Appointment Letters
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Generate formal appointment letters with auto-populated employee details, designations, and salary structures.
          </p>
        </div>
      </div>

      {/* Main List & Actions */}
      <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading module...</div>}>
        <AppointmentLetterList />
      </Suspense>
    </div>
  );
}
