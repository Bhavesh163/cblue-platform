"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { use } from "react";
import FixerResults from "../../../components/FixerResults";

export default function ResumeBookingPage({ params }: { params: Promise<{ locale: string, id: string }> }) {
  const { locale, id } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/v1/orders/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("subscriber_token")}` } });
        if (!res.ok) {
          // Fallback to searching all orders if needed, for safety
          const token = localStorage.getItem("subscriber_token");
          if (token) {
            const listRes = await fetch("/api/v1/orders/user", {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (listRes.ok) {
              const orders = await listRes.json();
              const found = orders.find((o: any) => o.id === id);
              if (found) {
                setOrder(found);
              }
            }
          }
        } else {
           setOrder(await res.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  if (loading) {
    return <div className="min-h-screen pt-24 pb-12 flex items-center justify-center">Loading...</div>;
  }

  if (!order) {
    return <div className="min-h-screen pt-24 pb-12 flex items-center justify-center">Order not found. <button onClick={() => router.push(`/${locale}/dashboard`)} className="ml-4 text-sky-600 underline">Return to Dashboard</button></div>;
  }

  // Determine initial step based on status
  let initialStep = "notify";
  if (order.status?.toUpperCase() === "PENDING") {
    initialStep = "notify"; // but partnerConfirmed will be true inside FixerResults
  } else if (order.status?.toUpperCase() === "CREATED") {
    initialStep = "matching";
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <FixerResults 
        locale={locale} 
        bookingType={order.type || "household"} 
        service={order.service || "Service"}
        tier={order.tier || undefined}
        description={order.description || ""}
        onNewBooking={() => router.push(`/${locale}/dashboard`)}
        initialStep={initialStep}
        initialOrderData={order}
      />
    </div>
  );
}
