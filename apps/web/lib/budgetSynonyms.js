export function normalizeBudgetServiceText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(
      /ตกแต่งภายใน|อินทีเรีย|ออกแบบภายใน|ตกแต่งออฟฟิศ|รีโนเวทภายใน|ปรับปรุงภายใน|บิ้วอิน|บิวอิน|装修|裝修|工装|公装|办公室装修|商业装修|室内设计/g,
      " fitout ",
    )
    .replace(
      /รื้อถอนคืนสภาพ|คืนสภาพ|ทำคืนสภาพ|ส่งคืนพื้นที่|恢复工程|还原|退租还原/g,
      " reinstatement ",
    )
    .replace(
      /ก่อสร้างเขียว|อาคารเขียว|อาคารประหยัดพลังงาน|绿色建筑|绿色施工/g,
      " green construction ",
    )
    .replace(/ก่อสร้าง|งานโยธา|งานโครงสร้าง|ก่อสร้างอาคาร|土建|施工|建筑施工/g, " construction ")
    .replace(/ประปา|สุขาภิบาล|งานท่อ|ระบบน้ำ|ท่อน้ำ|给排水|管道/g, " plumbing ")
    .replace(/\b(?:plumb(?:ing)?|pipes?|water\s+pipe|water\s+system)\b/g, " plumbing ")
    .replace(/ไฟฟ้า|ระบบไฟ|เดินสายไฟ|แสงสว่าง|电气|电力|照明/g, " electrical ")
    .replace(/\b(?:electric|wiring)\b/g, " electrical ")
    .replace(/เครื่องปรับอากาศ|ระบบปรับอากาศ|ล้างแอร์|ซ่อมแอร์|暖通|空调/g, " hvac ")
    .replace(/\b(?:air\s*conditioning|aircon|ac)\b/g, " hvac ")
    .replace(/พัฒนาเว็บไซต์|ทำเว็บ|เขียนเว็บ|เว็บไซต์|เว็บแอป|网站开发|网页设计/g, " website ")
    .replace(/\b(?:web\s*site|web\s*page|webpage)\b/g, " website ")
    .replace(/\bchat\s*bot\b/g, " chatbot ")
    .replace(
      /\b(?:office\s*)?(?:decoration|decorating|refurbishment|renovation|interior\s*work|interior\s*fitout|tenant\s*improvement)\b/g,
      " fitout ",
    )
    .replace(/\bf+i+i?t\s*[- ]?\s*out\b/g, " fitout ")
    .replace(/\bbuild\s*[- ]?\s*out\b/g, " fitout ")
    .replace(/\bbuildout\b/g, " fitout ")
    .replace(/\bfitouts\b/g, " fitout ")
    .replace(/\bgreen\s+construction\b/g, " construction ")
    .replace(/\bmake\s*[- ]?\s*good\b/g, " reinstatement ")
    .replace(/\bre\s*instate(?:ment)?\b/g, " reinstatement ")
    .replace(/square\s*meters?/g, " sqm ")
    .replace(/square\s*meter/g, " sqm ")
    .replace(/sq\.?\s*m\.?/g, " sqm ")
    .replace(/\s+/g, " ")
    .trim();
}
