const fs = require('fs');

const FILE = 'apps/web/app/[locale]/chat/[id]/ClientChatPage.tsx';
let data = fs.readFileSync(FILE, 'utf8');

const newCode = `
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function ClientChatPage({ orderId, locale }: { orderId: string, locale: string }) {
  const [order, setOrder] = useState<any>(null);
  const [isPartner, setIsPartner] = useState(false);
  
  useEffect(() => {
    const pToken = localStorage.getItem("subscriber_token");
    if(pToken) {
      setIsPartner(true);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("subscriber_token") || localStorage.getItem("token");
    if (!token) return;
    fetch(\`/api/v1/orders/\${orderId}\`, {
      headers: { Authorization: \`Bearer \${token}\` }
    })
      .then(res => res.json())
      .then(data => setOrder(data))
      .catch(console.error);
  }, [orderId]);

  if (!order) return <div className="p-12 text-center">Loading...</div>;

  return (
    <div className="max-w-md mx-auto p-4 py-8">
      <Link href={isPartner ? \`/\${locale}/fixers\` : \`/\${locale}/dashboard\`} className="text-blue-600 hover:underline mb-4 inline-block">
        &larr; Go back to {isPartner ? "Our Partner" : "Our Customer"}
      </Link>
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl animate-pulse">{order.status === 'ASSIGNED' ? '💰' : '⏳'}</span>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          {order.status === 'ASSIGNED' ? (isPartner ? 'Waiting for Customer Payment' : 'Pending Payment Confirmation') : 'Pending Actions'}
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          {order.status === 'ASSIGNED' ? 
            (isPartner ? 'Customer is currently proceeding with the processing fee payment.' : 'Partner has accepted. Please proceed with payment below.') : 
            'Waiting for system process'
          }
        </p>
        
        <div className="bg-gray-50 rounded-xl p-6 mb-6 text-sm text-left shadow-inner border border-gray-100">
          <div className="flex justify-between border-b pb-2 mb-2">
            <span className="text-gray-500">Draft PO Number</span>
            <span className="font-mono font-bold text-gray-800">PO-2605-{order.id.slice(0,4)}</span>
          </div>
          <div className="flex justify-between border-b pb-2 mb-2">
            <span className="text-gray-500">Service</span>
            <span className="font-bold text-gray-800">{order.serviceCategory}</span>
          </div>
          <div className="flex justify-between border-b pb-2 mb-2">
            <span className="text-gray-500">Status</span>
            <span className="font-bold text-gray-800">{order.status}</span>
          </div>
          <div className="flex justify-between mb-2 pb-2 border-b">
            <span className="text-gray-500">Estimated Project Cost</span>
            <span className="font-bold text-gray-800">฿{order.estimatedPrice || 'N/A'}</span>
          </div>
          <div className="flex flex-col mb-2">
            <span className="text-gray-500 mb-1">Project Details</span>
            <span className="font-semibold text-gray-700">{order.description}</span>
          </div>
          { order.image && (
             <div className="mt-4 border-t pt-4">
               <span className="text-gray-500 block mb-2">Uploaded Reference File</span>
               <a href={order.image} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">View Uploaded Image</a>
             </div>
          )}
        </div>
        
        { order.status === 'ASSIGNED' && !isPartner && (
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition" onClick={() => window.location.href = \`/\${locale}/payment\`}>
              Proceed to Temporary Payment Validation
            </button>
        )}
        
        <p className="text-xs text-gray-400 mt-4 leading-relaxed">
          The final service price is negotiated directly between you and the counterpart. 
          CBLUE acts only as a matching platform and does not determine or guarantee final pricing.
        </p>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(FILE, newCode);
console.log('Fixed ClientChatPage');
