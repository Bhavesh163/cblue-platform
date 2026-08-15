"use client";
import { useEffect, useState } from "react";
import { clearSubscriberSession } from "../../../lib/subscriberSession";

type Locale = "th" | "en" | "zh";
type Props = { locale: Locale; token: string | null | undefined; label: string; className?: string; onSuccess: () => void };
const copy = {
  th: { title: "ยืนยันการปิดบัญชี", description: "กรอกรหัสผ่านปัจจุบันเพื่อยืนยันการปิดบัญชี", password: "รหัสผ่านปัจจุบัน", cancel: "ยกเลิก", confirm: "ยืนยันการปิดบัญชี", processing: "กำลังดำเนินการ", show: "แสดงรหัสผ่าน", hide: "ซ่อนรหัสผ่าน", invalid: "รหัสผ่านปัจจุบันไม่ถูกต้อง", blocked: "กรุณาดำเนินการที่ยังค้างอยู่และการชำระเงินให้เสร็จก่อน", limited: "กรุณารอสักครู่แล้วลองใหม่", unavailable: "ไม่สามารถดำเนินการได้ในขณะนี้", failed: "ไม่สามารถปิดบัญชีได้ กรุณาลองใหม่" },
  en: { title: "Confirm account closure", description: "Enter your current password to confirm account closure.", password: "Current password", cancel: "Cancel", confirm: "Confirm account closure", processing: "Processing", show: "Show password", hide: "Hide password", invalid: "The current password is incorrect.", blocked: "Complete active work and pending payments before closing your account.", limited: "Please wait and try again.", unavailable: "This action is temporarily unavailable.", failed: "We could not close your account. Please try again." },
  zh: { title: "确认关闭账户", description: "请输入当前密码以确认关闭账户。", password: "当前密码", cancel: "取消", confirm: "确认关闭账户", processing: "处理中", show: "显示密码", hide: "隐藏密码", invalid: "当前密码不正确。", blocked: "请先完成进行中的工作并处理待付款项。", limited: "请稍候再试。", unavailable: "暂时无法完成此操作。", failed: "无法关闭账户，请重试。" },
} as const;

export default function AccountClosureDialog({ locale, token, label, className, onSuccess }: Props) {
  const [open, setOpen] = useState(false), [password, setPassword] = useState(""), [visible, setVisible] = useState(false), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  const text = copy[locale] || copy.en;
  useEffect(() => { if (!open) { setPassword(""); setVisible(false); setMessage(""); setBusy(false); } }, [open]);
  async function submit() {
    if (!token || password.length < 8) { setMessage(text.invalid); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/v1/users/me/account-closure", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ currentPassword: password }) });
      if (response.ok) { clearSubscriberSession(); setOpen(false); onSuccess(); return; }
      if (response.status === 401) setMessage(text.invalid); else if (response.status === 409) setMessage(text.blocked); else if (response.status === 429) setMessage(text.limited); else if (response.status === 503) setMessage(text.unavailable); else setMessage(text.failed);
    } catch { setMessage(text.unavailable); } finally { setBusy(false); }
  }
  return <>
    <button type="button" onClick={() => setOpen(true)} className={className}>{label}</button>
    {open && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="presentation"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="account-closure-title">
      <div className="flex items-start justify-between gap-4"><div><h2 id="account-closure-title" className="text-xl font-semibold text-gray-900">{text.title}</h2><p className="mt-2 text-sm leading-6 text-gray-600">{text.description}</p></div><button type="button" onClick={() => setOpen(false)} aria-label={text.cancel} disabled={busy} className="rounded-lg px-2 py-1 text-2xl text-gray-500">×</button></div>
      <label htmlFor="account-closure-password" className="mt-6 block text-sm font-semibold text-gray-700">{text.password}</label><div className="relative mt-2"><input id="account-closure-password" type={visible ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required className="w-full rounded-lg border border-gray-300 px-3 py-2.5 pr-12 text-gray-900" /><button type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? text.hide : text.show} aria-pressed={visible} className="absolute inset-y-0 right-0 px-3 text-gray-500"><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" /></svg></button></div>
      {message && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{message}</p>}<div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setOpen(false)} disabled={busy} className="rounded-lg border border-gray-300 px-4 py-2.5 font-semibold text-gray-700">{text.cancel}</button><button type="button" onClick={submit} disabled={busy || password.length < 8} className="rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white disabled:bg-gray-300">{busy ? text.processing : text.confirm}</button></div>
    </div></div>}
  </>;
}
