"use client";

import React, { forwardRef } from "react";

export interface LeaveApplicationPrintTemplateProps {
  cardNoOrDept?: string;
  employeeName?: string;
  designation?: string;
  reason?: string;
  dateText?: string;
  daysCount?: string;
}

const LeaveApplicationPrintTemplate = forwardRef<HTMLDivElement, LeaveApplicationPrintTemplateProps>(
  ({ cardNoOrDept, employeeName, designation, reason, dateText, daysCount }, ref) => {
    return (
      <div
        ref={ref}
        className="p-[25mm] px-[20mm] bg-white text-black font-sans print:p-0 w-full max-w-[210mm] print:max-w-[170mm] mx-auto min-h-[297mm] print:min-h-[247mm] flex flex-col justify-between box-border"
        style={{
          fontFamily: "'SolaimanLipi', 'SutonnyMJ', 'Vrinda', 'Arial', 'system-ui', sans-serif",
        }}
      >
        {/* Inject CSS print styles directly for strict A4 page boundary fitting with wide margins */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 25mm 20mm !important;
            }
            body {
              background: white !important;
              color: black !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}} />

        {/* Top/Main section */}
        <div className="space-y-6">
          {/* Header info */}
          <div className="text-left text-base leading-relaxed space-y-1 mb-6">
            <p>বরাবর,</p>
            <p>বাবস্থাপক</p>
            <p>ফেরারী ফ্যাশন ।</p>
          </div>

          {/* Subject heading */}
          <div className="mb-6">
            <h1 className="text-base font-normal">
              বিষয়ঃ <span className="font-bold">ছুটির জন্য আবেদন ।</span>
            </h1>
          </div>

          {/* Body content */}
          <div className="text-base space-y-6 leading-[2.4rem] text-justify">
            <p>জনাব,</p>
            <p>
              সবিনয় নিবেদন এই যে, আমি আপনার স্বনামধন্য শিল্প কারখানার ‘ফেরারী ফ্যাশন ’
            </p>
            
            <div className="flex items-end w-full">
              <span className="grow border-b border-dotted border-black min-h-[20px] px-2 text-base font-bold text-center">
                {cardNoOrDept || ""}
              </span>
              <span className="shrink-0 ml-1">এর একজন নিয়মিত কর্মকর্তা/ কর্মচারী ।</span>
            </div>

            <div className="flex items-end w-full">
              <span className="shrink-0 mr-1">আমার নাম</span>
              <span className="grow border-b border-dotted border-black min-h-[20px] px-2 text-base font-bold">
                {employeeName || ""}
              </span>
            </div>

            <div className="flex items-end w-full">
              <span className="shrink-0 mr-1">পদবীঃ</span>
              <span className="w-[300px] border-b border-dotted border-black min-h-[20px] px-2 text-base font-bold">
                {designation || ""}
              </span>
            </div>

            <div className="flex flex-col space-y-2 w-full">
              <div className="flex items-end w-full">
                <span className="shrink-0 mr-1">এমতাবস্থাই আমার</span>
                <span className="grow border-b border-dotted border-black min-h-[20px] px-2 text-base">
                  {reason || ""}
                </span>
                <span className="shrink-0 ml-1">।</span>
              </div>
              {!reason && (
                <div className="border-b border-dotted border-black w-full h-[20px]"></div>
              )}
            </div>

            <div className="flex items-end w-full flex-wrap gap-y-2 pt-2">
              <span className="shrink-0 mr-1">এজন্য</span>
              <span className="w-[200px] border-b border-dotted border-black min-h-[20px] text-center font-bold px-2">
                {dateText || ""}
              </span>
              <span className="shrink-0 mx-2">ইং</span>
              <span className="w-[100px] border-b border-dotted border-black min-h-[20px] text-center font-bold px-2">
                {daysCount || ""}
              </span>
              <span className="shrink-0 ml-1">দিন আত্র কারখানায় উপস্থিত হতে পারিনি ।</span>
            </div>

            <div className="pt-2 leading-[2.2rem]">
              অতএব, হুজুর সমীপে জনাবের নিকট আকুল আবেদন, উক্ত (
              <span className="px-2 border-b border-dotted border-black inline-block w-[120px] text-center font-bold">
                {daysCount || ""}
              </span>
              ) দিন ছুটি দানে
              <br />
              হুজুরের একান্ত মর্জি হয় ।
            </div>
          </div>
        </div>

        {/* Bottom / Signature / Approvals section */}
        <div className="mt-12 space-y-6">
          {/* Sincerely section */}
          <div className="text-left space-y-2">
            <p>বিনীত</p>
            <div className="w-[200px] border-b border-dotted border-black min-h-[20px] mt-4"></div>
            <div className="w-[250px] border-b border-dotted border-black min-h-[20px]"></div>
          </div>

          {/* Verification / Approval Signatures */}
          <div className="pt-8">
            <div className="flex justify-between items-center font-bold text-base">
              <div className="w-[150px] text-left">
                <p>ফেরারী ফ্যাশন</p>
              </div>
              <div className="w-[150px] text-center">
                <p>সুপারভাইজার</p>
              </div>
              <div className="w-[150px] text-right">
                <p className="underline underline-offset-4 decoration-1">সেকশন প্রধান</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

LeaveApplicationPrintTemplate.displayName = "LeaveApplicationPrintTemplate";

export default LeaveApplicationPrintTemplate;
