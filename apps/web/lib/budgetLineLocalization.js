const SERVICE_LABELS = {
  fitout: { en: "Fit-out", th: "งานตกแต่งภายใน", zh: "室内装修" },
  reinstatement: { en: "Reinstatement", th: "งานรื้อถอนคืนสภาพ", zh: "恢复工程" },
  construction: { en: "Construction", th: "งานก่อสร้าง", zh: "建筑施工" },
  website: { en: "Website development", th: "งานพัฒนาเว็บไซต์", zh: "网站开发" },
  chatbot: { en: "Chatbot development", th: "งานพัฒนาแชตบอต", zh: "聊天机器人开发" },
  plumbing: { en: "Plumbing", th: "งานประปา", zh: "管道工程" },
  electrical: { en: "Electrical", th: "งานไฟฟ้า", zh: "电气工程" },
  hvac: { en: "Air conditioning", th: "งานระบบปรับอากาศ", zh: "空调工程" },
  landscaping: { en: "Landscaping", th: "งานจัดสวน", zh: "园林绿化" },
  roofing: { en: "Cladding and roofing", th: "งานหลังคาและผนัง", zh: "屋顶与外墙工程" },
  cleaning: { en: "Cleaning", th: "งานทำความสะอาด", zh: "清洁服务" },
  handyman: { en: "Handyman", th: "งานช่างทั่วไป", zh: "综合维修" },
  "pest-control": { en: "Pest control", th: "งานกำจัดแมลง", zh: "虫害防治" },
  "mobile-app": { en: "Mobile app development", th: "งานพัฒนาแอปมือถือ", zh: "移动应用开发" },
  "ai-integration": { en: "AI integration", th: "งานบูรณาการ AI", zh: "AI集成" },
  software: { en: "Software development", th: "งานพัฒนาซอฟต์แวร์", zh: "软件开发" },
  "machine-learning": { en: "Machine learning", th: "งานแมชชีนเลิร์นนิง", zh: "机器学习" },
  consulting: { en: "Consulting", th: "งานที่ปรึกษา", zh: "咨询服务" },
  solar: { en: "Solar panels", th: "งานระบบโซลาร์เซลล์", zh: "太阳能系统" },
  "ev-charging": { en: "EV charging", th: "งานสถานีชาร์จ EV", zh: "电动车充电系统" },
  "green-design": { en: "Green building design", th: "งานออกแบบอาคารเขียว", zh: "绿色建筑设计" },
  "mep-retrofit": { en: "MEP and retrofit", th: "งานระบบ MEP และปรับปรุงอาคาร", zh: "机电与改造工程" },
  kitchen: { en: "Kitchen", th: "งานครัว", zh: "厨房工程" },
  automation: { en: "Automation", th: "งานระบบอัตโนมัติ", zh: "自动化系统" },
  environmental: { en: "Environmental services", th: "งานบริการสิ่งแวดล้อม", zh: "环境服务" },
  "security-cctv": { en: "Security and CCTV", th: "งานระบบรักษาความปลอดภัยและกล้องวงจรปิด", zh: "安防与监控系统" },
  "access-control": { en: "Door and access control", th: "งานระบบประตูและควบคุมการเข้าออก", zh: "门禁系统" },
  "smart-home-bms": { en: "Smart home and BMS", th: "งานสมาร์ทโฮมและ BMS", zh: "智能家居与楼宇管理系统" },
  "smart-agriculture": { en: "Smart farming", th: "งานเกษตรอัจฉริยะ", zh: "智慧农业" },
  legal: { en: "Legal services", th: "บริการกฎหมาย", zh: "法律服务" },
  accounting: { en: "Accounting", th: "บริการบัญชี", zh: "会计服务" },
  "audit-cpa": { en: "CPA audit", th: "บริการสอบบัญชี CPA", zh: "注册会计师审计" },
  architect: { en: "Architect", th: "บริการสถาปนิก", zh: "建筑师服务" },
  "interior-designer": { en: "Interior designer", th: "บริการมัณฑนากร", zh: "室内设计师服务" },
  "civil-design-engineer": { en: "Design civil engineer", th: "บริการวิศวกรโยธาออกแบบ", zh: "设计土木工程师" },
  "civil-construction-engineer": { en: "Construction civil engineer", th: "บริการวิศวกรโยธาก่อสร้าง", zh: "施工土木工程师" },
  "mechanical-design-engineer": { en: "Design mechanical engineer", th: "บริการวิศวกรเครื่องกลออกแบบ", zh: "设计机械工程师" },
  "mechanical-construction-engineer": { en: "Construction mechanical engineer", th: "บริการวิศวกรเครื่องกลก่อสร้าง", zh: "施工机械工程师" },
  "electrical-design-engineer": { en: "Design electrical engineer", th: "บริการวิศวกรไฟฟ้าออกแบบ", zh: "设计电气工程师" },
  "electrical-construction-engineer": { en: "Construction electrical engineer", th: "บริการวิศวกรไฟฟ้าก่อสร้าง", zh: "施工电气工程师" },
  programmer: { en: "Software programmer", th: "บริการโปรแกรมเมอร์", zh: "软件程序员" },
  "digital-marketing": { en: "Digital marketing", th: "บริการการตลาดดิจิทัล", zh: "数字营销" },
  "safety-officer": { en: "Safety officer", th: "บริการเจ้าหน้าที่ความปลอดภัย", zh: "安全官服务" },
};

const SERVICE_ALIASES = {
  fitout: ["fit out", "fit-out", "interior fitout", "interior work"],
  reinstatement: ["reinstate", "make good", "site restoration"],
  construction: ["building construction", "office building construction", "civil construction", "green construction"],
  website: ["website", "web development", "website development", "web page", "webpage"],
  chatbot: ["chatbot", "chat bot", "chatbot development", "faq chatbot"],
  hvac: ["ac", "air conditioning", "hvac"],
  roofing: ["roofing", "cladding", "cladding roofing"],
  "mobile-app": ["mobile app", "mobile app development", "application development"],
  "ai-integration": ["ai", "ai integration", "artificial intelligence integration"],
  software: ["software", "software development", "software engineering", "custom software"],
  "machine-learning": ["machine learning", "ml model"],
  solar: ["solar", "solar panel", "solar panels", "solar cell"],
  "ev-charging": ["ev charging", "ev charger"],
  "green-design": ["green design", "green building design"],
  "mep-retrofit": ["mep", "mep retrofit", "retrofit"],
  "security-cctv": ["security", "cctv", "security cctv"],
  "access-control": ["access control", "door access control"],
  "smart-home-bms": ["smart home", "smart building", "bms"],
  "smart-agriculture": ["smart farming", "smart agriculture"],
  "audit-cpa": ["cpa", "audit", "cpa audit"],
};

const UNIT_LABELS = {
  area: { en: "sq.m.", th: "ตร.ม.", zh: "平方米" },
  page: { en: "page", th: "หน้า", zh: "页" },
  faq: { en: "FAQ", th: "ข้อ", zh: "条" },
  unit: { en: "unit", th: "หน่วย", zh: "个" },
  job: { en: "job", th: "งาน", zh: "项" },
  room: { en: "room", th: "ห้อง", zh: "间" },
  floor: { en: "floor", th: "ชั้น", zh: "层" },
};

const UNIT_ALIASES = {
  area: ["sqm", "sq m", "sq.m", "sq.m.", "m2", "m²", "square meter", "square meters", "ตร ม", "ตร.ม.", "ตารางเมตร", "平方米", "平米"],
  page: ["page", "pages", "หน้า", "页", "頁"],
  faq: ["faq", "faqs", "ข้อ", "คำถาม", "问答", "問答"],
  unit: ["unit", "units", "ชุด", "ชิ้น", "个", "個"],
  job: ["job", "jobs", "งาน", "项目", "項目"],
  room: ["room", "rooms", "ห้อง", "房间", "房間"],
  floor: ["floor", "floors", "ชั้น", "楼层", "樓層"],
};

const normalize = (value) =>
  String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/[&/+_,;:()[\]{}"'`~!?。，“”‘’、.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const serviceAliasIndex = new Map();
for (const [key, labels] of Object.entries(SERVICE_LABELS)) {
  const aliases = [key, ...Object.values(labels), ...(SERVICE_ALIASES[key] || [])];
  for (const alias of aliases) serviceAliasIndex.set(normalize(alias), key);
}

const unitAliasIndex = new Map();
for (const [key, aliases] of Object.entries(UNIT_ALIASES)) {
  unitAliasIndex.set(normalize(key), key);
  for (const alias of aliases) unitAliasIndex.set(normalize(alias), key);
}

const supportedLocale = (locale) => (locale === "th" || locale === "zh" ? locale : "en");

export function canonicalBudgetServiceKey(service, serviceKey) {
  const explicit = String(serviceKey || "").trim().toLocaleLowerCase("en");
  if (explicit && SERVICE_LABELS[explicit]) return explicit;
  return serviceAliasIndex.get(normalize(service)) || null;
}

export function canonicalBudgetUnitKey(unit, unitKey) {
  const explicit = String(unitKey || "").trim().toLocaleLowerCase("en");
  if (explicit && UNIT_LABELS[explicit]) return explicit;
  return unitAliasIndex.get(normalize(unit)) || null;
}

export function enrichBudgetBreakdown(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    const serviceKey = canonicalBudgetServiceKey(item?.service, item?.serviceKey);
    const unitKey = canonicalBudgetUnitKey(item?.unit, item?.unitKey);
    return {
      ...item,
      ...(serviceKey ? { serviceKey } : {}),
      ...(unitKey ? { unitKey } : {}),
    };
  });
}

export function localizeBudgetBreakdown(items, locale) {
  const language = supportedLocale(locale);
  return enrichBudgetBreakdown(items).map((item) => ({
    ...item,
    service: SERVICE_LABELS[item.serviceKey]?.[language] || item.service,
    unit: UNIT_LABELS[item.unitKey]?.[language] || item.unit,
  }));
}

export function localizeBudgetServiceList(items, locale) {
  const labels = localizeBudgetBreakdown(items, locale)
    .map((item) => String(item?.service || "").trim())
    .filter(Boolean);
  return [...new Set(labels)].join(", ");
}
