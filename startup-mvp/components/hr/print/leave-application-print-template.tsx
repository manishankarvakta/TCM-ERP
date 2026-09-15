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
        className="p-[20mm] bg-white text-black font-sans print:p-0 w-full max-w-[210mm] print:max-w-[170mm] mx-auto min-h-[297mm] print:min-h-[247mm] flex flex-col justify-between box-border"
        style={{
          fontFamily: "'SolaimanLipi', 'SutonnyMJ', 'Vrinda', 'Arial', 'system-ui', sans-serif",
        }}
      >
        {/* Inject CSS print styles directly for strict A4 page boundary fitting */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 20mm 15mm !important;
            }
            body {
              background: white !important;
              color: black !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `,
          }}
        />

        {/* TOP SECTION */}
        <div className="space-y-5">
          {/* Executive Company Header */}
          <div className="border-b-2 border-black pb-3 text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-black uppercase">
              FERRARI FASHION LTD.
            </h1>
            <p className="text-lg font-semibold text-gray-800">ফেরারী ফ্যাশন লিমিটেড</p>
            <p className="text-xs text-gray-600 mt-0.5">
              Garments Manufacturing & Export Industry • HR & Payroll Department
            </p>
            <div className="mt-2.5 inline-block bg-black text-white px-4 py-1 text-sm font-bold rounded uppercase tracking-wider print:bg-black print:text-white">
              LEAVE APPLICATION FORM / ছুটির আবেদনপত্র
            </div>
          </div>

          {/* Recipient Header & Form Ref */}
          <div className="flex justify-between items-start text-sm leading-relaxed pt-1">
            <div>
              <p className="font-semibold">বরাবর,</p>
              <p className="font-semibold">ব্যবস্থাপনা পরিচালক / মানবসম্পদ বিভাগ</p>
              <p className="font-bold text-gray-900">ফেরারী ফ্যাশন লিমিটেড</p>
            </div>
            <div className="text-right text-xs border border-black p-2 rounded">
              <p>তারিখ / Date: <span className="font-bold underline">{new Date().toLocaleDateString("en-GB")}</span></p>
              <p className="mt-1 font-semibold text-gray-700">ফর্ম নং / Form Ref: FFL-HR-LV-01</p>
            </div>
          </div>

          {/* Subject Line */}
          <div className="bg-gray-100 print:bg-gray-100 p-2 border border-gray-400 rounded text-center">
            <h2 className="text-sm font-bold text-gray-900">
              বিষয়ঃ ছুটির জন্য আবেদনপত্র (Application for Leave)
            </h2>
          </div>

          {/* Structured Employee Details Grid Table */}
          <div className="border border-black rounded overflow-hidden">
            <div className="bg-gray-200 print:bg-gray-200 px-3 py-1 font-bold text-xs uppercase border-b border-black text-gray-900">
              ১. আবেদনকারীর তথ্যাবলী (Applicant Information)
            </div>
            <div className="grid grid-cols-2 text-xs divide-x divide-y divide-black">
              <div className="p-2 flex items-center">
                <span className="font-semibold w-36 shrink-0">নাম (Name):</span>
                <span className="font-bold text-gray-900 border-b border-dotted border-gray-500 grow px-1 min-h-[20px]">
                  {employeeName || ""}
                </span>
              </div>
              <div className="p-2 flex items-center">
                <span className="font-semibold w-36 shrink-0">আইডি/কার্ড (ID/Card No):</span>
                <span className="font-bold text-gray-900 border-b border-dotted border-gray-500 grow px-1 min-h-[20px]">
                  {cardNoOrDept || ""}
                </span>
              </div>
              <div className="p-2 flex items-center">
                <span className="font-semibold w-36 shrink-0">পদবী (Designation):</span>
                <span className="font-bold text-gray-900 border-b border-dotted border-gray-500 grow px-1 min-h-[20px]">
                  {designation || ""}
                </span>
              </div>
              <div className="p-2 flex items-center">
                <span className="font-semibold w-36 shrink-0">বিভাগ (Department):</span>
                <span className="font-bold text-gray-900 border-b border-dotted border-gray-500 grow px-1 min-h-[20px]">
                  {cardNoOrDept || ""}
                </span>
              </div>
            </div>
          </div>

          {/* Leave Details Table */}
          <div className="border border-black rounded overflow-hidden">
            <div className="bg-gray-200 print:bg-gray-200 px-3 py-1 font-bold text-xs uppercase border-b border-black text-gray-900">
              ২. ছুটির বিবরণী (Leave Details)
            </div>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 print:bg-gray-100 border-b border-black font-bold text-center">
                  <th className="p-2 border-r border-black w-1/3">ছুটির কারণ (Reason for Leave)</th>
                  <th className="p-2 border-r border-black w-1/3">ছুটির সময়সীমা (Period)</th>
                  <th className="p-2 w-1/3">মোট দিন (Total Days)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-center min-h-[40px]">
                  <td className="p-2.5 border-r border-black font-medium text-left align-top">
                    {reason ? (
                      <span className="font-bold text-gray-900">{reason}</span>
                    ) : (
                      <div className="space-y-2 pt-1">
                        <div className="border-b border-dotted border-black w-full"></div>
                        <div className="border-b border-dotted border-black w-full"></div>
                      </div>
                    )}
                  </td>
                  <td className="p-2.5 border-r border-black font-medium align-top">
                    {dateText ? (
                      <span className="font-bold text-gray-900">{dateText}</span>
                    ) : (
                      <div className="pt-2 border-b border-dotted border-black w-full min-h-[18px]"></div>
                    )}
                  </td>
                  <td className="p-2.5 font-medium align-top">
                    {daysCount ? (
                      <span className="font-bold text-sm text-gray-900">{daysCount} দিন</span>
                    ) : (
                      <div className="pt-2 border-b border-dotted border-black w-20 mx-auto min-h-[18px]"></div>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Formal Application Statement */}
          <div className="text-xs leading-relaxed space-y-2 text-justify border border-gray-400 p-3 rounded bg-gray-50/50 print:bg-white">
            <p>জনাব,</p>
            <p>
              সবিনয় নিবেদন এই যে, আমি আপনার প্রতিষ্ঠানে উল্লিখিত পদবীতে কর্মরত আছি। আমার ব্যক্তিগত / জরুরি প্রয়োজনে উপরোক্ত সময়সূচী অনুযায়ী ছুটি মঞ্জুর করার জন্য সবিনয় অনুরোধ জানাচ্ছি।
            </p>
            <p>
              অতএব, প্রার্থনা এই যে মহোদয় যেন আমার উক্ত{" "}
              <span className="font-bold underline px-1">{daysCount || "________"}</span> দিনের ছুটি মঞ্জুর করতে মর্জি হয়।
            </p>
          </div>
        </div>

        {/* BOTTOM / SIGNATURE SECTION */}
        <div className="mt-6 space-y-6">
          {/* Handover & Emergency Contact info box */}
          <div className="grid grid-cols-2 gap-4 text-xs border border-gray-400 p-2.5 rounded">
            <div>
              <span className="font-bold block mb-1">ছুটিকালীন দায়িত্বপ্রাপ্ত ব্যক্তি (Duty Handover):</span>
              <div className="border-b border-dotted border-black min-h-[18px]"></div>
            </div>
            <div>
              <span className="font-bold block mb-1">জরুরি যোগাযোগের ফোন (Emergency Contact):</span>
              <div className="border-b border-dotted border-black min-h-[18px]"></div>
            </div>
          </div>

          {/* 4-Column Authoritative Signature Block */}
          <div className="pt-4 border-t-2 border-gray-300">
            <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
              <div className="flex flex-col justify-between h-16">
                <div className="border-b border-black mx-2"></div>
                <p>আবেদনকারীর স্বাক্ষর<br /><span className="text-[10px] font-normal text-gray-600">(Applicant)</span></p>
              </div>

              <div className="flex flex-col justify-between h-16">
                <div className="border-b border-black mx-2"></div>
                <p>সুপারভাইজার / সেকশন ইনচার্জ<br /><span className="text-[10px] font-normal text-gray-600">(Supervisor)</span></p>
              </div>

              <div className="flex flex-col justify-between h-16">
                <div className="border-b border-black mx-2"></div>
                <p>এইচআর / অ্যাডমিন বিভাগ<br /><span className="text-[10px] font-normal text-gray-600">(HR & Admin)</span></p>
              </div>

              <div className="flex flex-col justify-between h-16">
                <div className="border-b border-black mx-2"></div>
                <p>ব্যবস্থাপনা পরিচালক / কর্তৃপক্ষ<br /><span className="text-[10px] font-normal text-gray-600">(Managing Director)</span></p>
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

