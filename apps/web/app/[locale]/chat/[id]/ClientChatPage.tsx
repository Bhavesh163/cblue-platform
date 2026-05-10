"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function ClientChatPage({ orderId, locale }: { orderId: string, locale: string }) {
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("subscriber_token") || localStorage.getItem("token");
    if (!token) return;
    fetch(`/api/v1/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setOrder(data))
      .catch(console.error);
  }, [orderId]);

  if (!order) return <div className="p-12 text-center">Loading...</div>;

  return (
    <div className="max-w-md mx-auto p-4 py-8">
      <Link href={`/${locale}/dashboard`} className="text-blue-600 hover:underline mb-4 inline-block">&larr; Back to Dashboard</Link>
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl animate-pulse">⏳</span>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Waiting for Partner Confirmation</h2>
        <p className="text-gray-500 text-sm mb-6">
          We've notified the partner about your booking. They will review and confirm shortly.
        </p>
        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm text-left">
          <div className="flex justify-between mb-1">
            <span className="text-gray-500">Service</span>
            <span className="font-bold text-gray-800">{order.serviceCategory}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-gray-500">Status</span>
            <span className="font-bold text-gray-800">{order.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Processing Fee</span>
            <span className="font-bold text-gray-800">฿{order.estimatedPrice || 100}</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          The final service price is negotiated directly between you and the service provider. 
          CBLUE acts only as a matching platform and does not determine or guarantee final pricing.
        </p>
      </div>
    </div>
  );
}
