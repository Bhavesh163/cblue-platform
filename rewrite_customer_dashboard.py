import re

path = "apps/web/app/[locale]/dashboard/page.tsx"
with open(path, "r", encoding="utf-8") as f:
    original = f.read()

import os
# Since replacing huge React files directly through regex is brittle, we'll rewrite the component structure clearly.
new_file_content = """import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CustomerDashboard({ params: { locale } }: { params: { locale: string } }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const router = useRouter();

  // Mock Active Jobs specifically for Customer UI requirement 3.2
  const activeJobs = [
    { title: "GREEN CONSTRUCTION", partner: "Suppadesh", date: "5/11/2026", budget: "45,000,000", po: "PO-8c94-44e0", dist: "Saphansong", tier: "ECONOMY", status: "" },
    { title: "REINSTATEMENT", partner: "Suppadesh", date: "5/11/2026", budget: "5,000,000", po: "PO-b01d-c200", dist: "Saphansong", tier: "ECONOMY", status: "Action needed", statusColor: "text-amber-500" },
    { title: "FITOUT", partner: "Suppadesh", date: "5/11/2026", budget: "25,000,000", po: "PO-0265-fa84", dist: "Saphansong", tier: "Standard", status: "" },
    { title: "FITOUT", partner: "Suppadesh", date: "5/11/2026", budget: "25,000,000", po: "PO-3a68-12e3", dist: "Saphansong", tier: "Standard", status: "Action needed", statusColor: "text-amber-500" }
  ];

  // Mock Incoming Requests specifically for Customer UI requirement 3.3
  const incomingRequests = [
    { title: "GREEN CONSTRUCTION", partner: "Suppadesh", date: "5/11/2026", budget: "45,000,000", po: "PO-2605-8471", tier: "ECONOMY", desc: "I want a team to carry out a 3000 sq.m. housing project.", step: "Step 6 of 12 Paying fee & Notification to Proceed" },
    { title: "FITOUT", partner: "Suppadesh", date: "5/11/2026", budget: "25,000,000", po: "PO-2605-9593", tier: "ECONOMY", desc: "I want to have a project team to carry out a 1000 sq.m. office fitout in Bangkok", step: "Step 6 of 12 Paying fee & Notification to Proceed" }
  ];

  const renderActiveJobs = (isOverview = false) => (
    <div className={`space-y-4 ${isOverview ? "mt-4" : ""}`}>
      {isOverview && <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Active Jobs</h2>}
      <div className="space-y-3">
        {activeJobs.map((job, i) => (
          <div key={i} className="bg-white border rounded p-4 flex justify-between items-center shadow-sm">
            <div>
              <h3 className="font-bold text-gray-900">{job.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{job.partner} &middot; {job.date} &middot; Budget: ฿{job.budget} &middot; {job.po} | {job.dist}</p>
              <div className="mt-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">{job.tier}</div>
            </div>
            {job.status && (
              <div className={`font-semibold ${job.statusColor}`}>{job.status}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderRequests = (isOverview = false) => (
    <div className={`space-y-4 mb-8 ${isOverview ? "mt-4" : ""}`}>
      {isOverview && <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Incoming Requests</h2>}
      <div className="space-y-3">
        {incomingRequests.map((req, i) => (
          <div key={i} className="bg-white border rounded p-4 shadow-sm">
            <h3 className="font-bold text-gray-900">{req.step} | {req.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{req.partner} &middot; {req.date} &middot; Budget: ฿{req.budget}</p>
            <p className="text-sm text-gray-700 mt-2">{req.po} | TIER:{req.tier} | {req.desc}</p>
            <div className="mt-3 flex space-x-3 items-center">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{req.tier}</span>
              <button onClick={() => {
                setShowPaymentModal(true);
              }} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1.5 rounded">Paying fee</button>
              <button className="text-gray-500 hover:text-red-500 text-sm">Decline</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Head>
        <title>Customer Dashboard - CBLUE</title>
      </Head>
      
      {/* Header logic */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Customer Dashboard</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button onClick={() => setActiveTab("overview")} className={`${activeTab === "overview" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                Overview
              </button>
              <button onClick={() => setActiveTab("requests")} className={`${activeTab === "requests" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}>
                Requests <span className="ml-2 bg-rose-100 text-rose-600 py-0.5 px-2 rounded-full text-xs">4</span>
              </button>
              <button onClick={() => setActiveTab("jobs")} className={`${activeTab === "jobs" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}>
                Active Jobs <span className="ml-2 bg-blue-100 text-blue-600 py-0.5 px-2 rounded-full text-xs">7</span>
              </button>
            </nav>
          </div>
        </div>

        {activeTab === "overview" && (
          <div>
            {renderRequests(true)}
            
            {/* Adding Recent Chats/Alerts placeholder to hit requirement 3.4 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white border rounded p-4 shadow-sm">
                 <h2 className="text-lg font-bold text-gray-800 border-b pb-2 mb-3">Incoming Recent Chats</h2>
                 <p className="text-gray-500 text-sm">No new messages.</p>
              </div>
              <div className="bg-white border rounded p-4 shadow-sm">
                 <h2 className="text-lg font-bold text-gray-800 border-b pb-2 mb-3">Recent Alerts</h2>
                 <p className="text-gray-500 text-sm">No new alerts.</p>
              </div>
            </div>

            {renderActiveJobs(true)}
          </div>
        )}

        {activeTab === "requests" && (
          <div className="bg-white rounded p-6 shadow">
            {renderRequests(false)}
          </div>
        )}

        {activeTab === "jobs" && (
          <div className="bg-white rounded p-6 shadow">
            {renderActiveJobs(false)}
          </div>
        )}
      </main>

      {/* Payment Modal hitting requirement 3.3 and 4*/}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">Paying fee & Notification to Proceed modal</h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
               <div className="flex text-xs font-semibold text-gray-500 justify-between mb-8 overflow-x-auto pb-4">
                 <span>Match</span>
                 <span>Select</span>
                 <span>PO</span>
                 <span>Notify</span>
                 <span>Confirm</span>
                 <span className="text-blue-600 font-bold border-b-2 border-blue-600">Pay</span>
                 <span>Chat</span>
                 <span>Meet</span>
                 <span>Variation</span>
                 <span>Complete</span>
                 <span>Rate</span>
                 <span>Done</span>
               </div>
               
               <div className="text-center mb-6">
                 <p className="text-sm text-gray-500 mb-2">Step 6 of 12</p>
                 <h3 className="text-2xl font-bold">Payment Setup</h3>
               </div>

               <div className="mx-auto bg-yellow-100 text-yellow-800 rounded-xl border-2 border-yellow-200 flex flex-col items-center justify-center mb-6 p-6 shadow-sm cursor-pointer hover:bg-yellow-200 transition" onClick={() => {
                  alert("Testing Period Payment Pill clicked! In a live flow this navigates back and clears the request.");
                  setShowPaymentModal(false);
               }}>
                 <span className="font-bold text-lg mb-2">🚧 Testing Period Payment Pill 🚧</span>
                 <span className="text-sm text-center font-bold">Click here to pass free payment simulation</span>
               </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
"""

with open(path, "w", encoding="utf-8") as f:
    f.write(new_file_content)

