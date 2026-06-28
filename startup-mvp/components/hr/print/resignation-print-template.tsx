"use client";

import React, { forwardRef } from "react";

export interface ResignationPrintTemplateProps {
  dateText?: string;
  employeeName?: string;
  sectionName?: string;
  designation?: string;
  reason?: string;
  effectiveDate?: string;
}

const ResignationPrintTemplate = forwardRef<HTMLDivElement, ResignationPrintTemplateProps>(
  ({ dateText, employeeName, sectionName, designation, reason, effectiveDate }, ref) => {
    return (
      <div
        ref={ref}
        className="p-[15mm] bg-white text-black font-serif print:p-0 w-full max-w-[210mm] print:max-w-[180mm] mx-auto min-h-[297mm] print:min-h-[267mm] flex flex-col justify-between box-border"
        style={{
          fontFamily: "'SolaimanLipi', 'SutonnyMJ', 'Vrinda', 'Arial', sans-serif",
        }}
      >
        {/* Inject CSS print styles directly for strict A4 page boundary fitting */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 15mm !important;
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
        <div>
          {/* Date info on top-left (as shown in the PDF) */}
          <div className="text-left text-base mb-4 flex items-end">
            <span className="shrink-0 mr-2">তারিখঃ</span>
            <span className="w-[150px] border-b border-dotted border-black min-h-[24px] px-2 text-lg font-bold">
              {dateText || ""}
            </span>
          </div>

          {/* Header/Address info */}
          <div className="text-left text-base leading-relaxed space-y-1 mb-6">
            <p className="text-lg">বরাবর</p>
            <p className="text-lg">ব্যবস্থাপক</p>
            <p className="text-lg">মানবসম্পদ বিভাগ</p>
            <p className="text-lg font-bold">ফেরারী ফ্যাশন</p>
            <p className="text-base">ইউনিক, বাইপাইল, আশুলিয়া, সাভার, ঢাকা।</p>
          </div>

          {/* Subject heading */}
          <div className="mb-6">
            <h1 className="text-lg font-bold border-b border-black pb-1 inline-block">
              বিষয়ঃ চাকুরী হইতে অব্যাহতি প্রদান প্রসঙ্গে।
            </h1>
          </div>

          {/* Body content */}
          <div className="text-base space-y-5 leading-[2.2rem] text-justify">
            <p className="text-lg">জনাব</p>
            <p className="indent-12">
              সবিনয় নিবেদন এই যে, আমি আপনার তৈরি পোশাক কারখানার একজন নিয়মিত শ্রমিক
            </p>

            <div className="flex items-end w-full flex-wrap gap-y-2">
              <span className="shrink-0 mr-2">আমার নাম</span>
              <span className="grow border-b border-dotted border-black min-h-[24px] px-2 text-lg font-bold">
                {employeeName || ""}
              </span>
              <span className="shrink-0 mx-2">, সেকশন</span>
              <span className="grow max-w-[200px] border-b border-dotted border-black min-h-[24px] px-2 text-lg font-bold text-center">
                {sectionName || ""}
              </span>
              <span className="shrink-0 ml-1">,</span>
            </div>

            <div className="flex items-end w-full flex-wrap gap-y-2">
              <span className="shrink-0 mr-2">পদবী</span>
              <span className="grow max-w-[240px] border-b border-dotted border-black min-h-[24px] px-2 text-lg font-bold text-center">
                {designation || ""}
              </span>
              <span className="shrink-0 mx-2">। আমার</span>
              <span className="grow border-b border-dotted border-black min-h-[24px] px-2 text-lg">
                {reason || ""}
              </span>
            </div>

            <div className="flex items-end w-full flex-wrap gap-y-2">
              {!reason && (
                <span className="grow border-b border-dotted border-black min-h-[24px] w-full mr-2"></span>
              )}
              <span className="shrink-0 mr-2">কারনে আগামী</span>
              <span className="grow max-w-[160px] border-b border-dotted border-black min-h-[24px] px-2 text-lg font-bold text-center">
                {effectiveDate || ""}
              </span>
              <span className="shrink-0 mx-2">ইং</span>
              <span className="shrink-0">তারিখ হইতে কাজ চালিয়ে যাওয়া সমভাব হবে না।</span>
            </div>

            <p className="text-justify leading-relaxed">
              অতএব জনাবের নিকট আকুল আবেদন উক্ত তারিখ থেকে অব্যাহতি প্রদানে মর্জি হয়।
            </p>
          </div>
        </div>

        {/* Bottom / Signature / Approvals section */}
        <div className="mt-12">
          {/* Sincerely section */}
          <div className="mb-10 text-left w-[180px] text-base space-y-3">
            <p className="text-lg">বিনীত</p>
            <div className="border-b border-dotted border-black w-full h-[24px] mt-4"></div>
          </div>

          {/* Verification / Approval Signatures */}
          <div className="border-t border-black pt-6">
            <div className="flex justify-between items-center text-center text-base font-bold">
              <div className="w-[150px]">
                <div className="h-[30px]"></div>
                <p className="border-t border-black pt-2">সুপারভাইজার</p>
              </div>
              <div className="w-[150px]">
                <div className="h-[30px]"></div>
                <p className="border-t border-black pt-2">সেকসন প্রধান</p>
              </div>
              <div className="w-[150px]">
                <div className="h-[30px]"></div>
                <p className="border-t border-black pt-2">এডমিন</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ResignationPrintTemplate.displayName = "ResignationPrintTemplate";

export default ResignationPrintTemplate;
