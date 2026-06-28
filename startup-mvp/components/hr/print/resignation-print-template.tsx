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
    const hasData = !!(dateText || employeeName || sectionName || designation || reason || effectiveDate);

    return (
      <div
        ref={ref}
        className="px-[25mm] py-[25mm] bg-white text-black font-serif print:p-0 w-full max-w-[210mm] print:max-w-[180mm] mx-auto min-h-[297mm] print:min-h-[247mm] print:h-[247mm] flex flex-col justify-between box-border"
        style={{
          fontFamily: "'SolaimanLipi', 'SutonnyMJ', 'Vrinda', 'Arial', sans-serif",
          pageBreakInside: "avoid",
        }}
      >
        {/* Inject CSS print styles for strict A4 page boundary fitting */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 25mm 20mm 20mm 20mm !important;
            }
            body {
              background: white !important;
              color: black !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}} />

        {/* Form Body Container */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            {/* 1. Date line */}
            <div className="text-left text-lg mb-6 leading-relaxed">
              {hasData && dateText ? (
                <p>
                  তারিখঃ <span className="border-b border-dotted border-black px-2 font-bold">{dateText}</span>
                </p>
              ) : (
                <p>তারিখ........................</p>
              )}
            </div>

            {/* 2. Recipient Address */}
            <div className="text-left text-lg leading-[2.2rem] mb-8 space-y-1">
              <p>বরাবর</p>
              <p>ব্যবস্থাপক</p>
              <p>মানবসম্পদ বিভাগ</p>
              <p className="font-semibold">ফেরারী ফ্যাশন</p>
              <p>ইউনিক, বাইপাইল, আশুলিয়া, সাভার, ঢাকা ।</p>
            </div>

            {/* 3. Subject Line (Bold, No Underline, Space before Dari) */}
            <div className="mb-8">
              <p className="text-lg font-bold">
                বিষয়ঃ চাকুরী হইতে অব্যাহতি প্রদান প্রসঙ্গে ।
              </p>
            </div>

            {/* 4. Body Content */}
            <div className="text-lg space-y-6 leading-[2.6rem] text-justify">
              <p>জনাব</p>
              
              {!hasData ? (
                /* Strict Blank Form Layout matching the Screenshot */
                <div className="space-y-6">
                  <p className="indent-12">
                    সবিনয় নিবেদন এই যে, আমি আপনার তৈরি পোশাক কারখানার একজন নিয়মিত শ্রমিক
                  </p>
                  <p>
                    আমার নাম ................................................., সেকশন .......................................,
                  </p>
                  <p>
                    পদবী ...........................................................। আমার .........................................
                  </p>
                  <p>
                    .........................................................কারনে আগামী ................................... ইং
                  </p>
                  <p>
                    তারিখ হইতে কাজ চালিয়ে যাওয়া সমভাব হবে না।
                  </p>
                </div>
              ) : (
                /* Dynamic Filled Layout */
                <div className="space-y-6">
                  <p className="indent-12 text-justify">
                    সবিনয় নিবেদন এই যে, আমি আপনার তৈরি পোশাক কারখানার একজন নিয়মিত শ্রমিক। আমার নাম{" "}
                    <span className="border-b border-dotted border-black px-2 font-bold">{employeeName || "................................................."}</span>
                    , সেকশন{" "}
                    <span className="border-b border-dotted border-black px-2 font-bold">{sectionName || "......................................."}</span>
                    , পদবী{" "}
                    <span className="border-b border-dotted border-black px-2 font-bold">{designation || "..........................................................."}</span>
                    । আমার{" "}
                    <span className="border-b border-dotted border-black px-2 font-bold">{reason || "........................................................."}</span>{" "}
                    কারনে আগামী{" "}
                    <span className="border-b border-dotted border-black px-2 font-bold">{effectiveDate || "..................................."}</span> ইং তারিখ হইতে কাজ চালিয়ে যাওয়া সমভাব হবে না।
                  </p>
                </div>
              )}

              <p className="leading-relaxed mt-4">
                অতএব জনাবের নিকট আকুল আবেদন উক্ত তারিখ থেকে অব্যাহতি প্রদানে মর্জি হয়।
              </p>
            </div>
          </div>

          {/* 5. Footer / Signature Section */}
          <div className="mt-auto">
            {/* Sincerely segment */}
            <div className="mb-14 text-left w-[200px] text-lg space-y-4">
              <p>বিনীত</p>
              <p className="tracking-widest">................................</p>
            </div>

            {/* Verification Signatures at the bottom (No borders, spaced columns) */}
            <div className="w-full mt-10">
              <div className="flex justify-between items-center text-center text-lg font-semibold">
                <div className="w-[180px]">
                  <p>সুপারভাইজার</p>
                </div>
                <div className="w-[180px]">
                  <p>সেকসন প্রধান</p>
                </div>
                <div className="w-[180px]">
                  <p>এডমিন</p>
                </div>
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
