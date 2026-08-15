const DEFAULT_MESSAGES = {
  th: "ไม่สามารถอัปเดตเบอร์โทรศัพท์ได้ กรุณาลองอีกครั้ง",
  zh: "无法更新电话号码，请重试",
  en: "We could not update your phone number. Please try again.",
};

const CONFLICT_MESSAGES = {
  th: "เบอร์โทรศัพท์นี้เชื่อมโยงกับบัญชีอื่นที่ใช้งานอยู่แล้ว",
  zh: "此电话号码已关联到另一个有效账户。",
  en: "This phone number is already linked to another active account.",
};

export function customerPhoneUpdateError(locale, status) {
  const language = locale === "th" || locale === "zh" ? locale : "en";
  return status === 409 ? CONFLICT_MESSAGES[language] : DEFAULT_MESSAGES[language];
}
