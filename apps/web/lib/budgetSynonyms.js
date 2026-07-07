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
    .replace(/\b(?:plumb(?:ing|er)?|plum(?:b|p|bing)?|pipes?|pipework|water\s+pipe|water\s+system|sanitary|sanitation)\b/g, " plumbing ")
    .replace(/ไฟฟ้า|ระบบไฟ|เดินสายไฟ|แสงสว่าง|电气|电力|照明/g, " electrical ")
    .replace(/\b(?:elec|electric|electricals?|electrician|electrial|electic|wiring|wirring|wireing|rewiring|lighting)\b/g, " electrical ")
    .replace(/เครื่องปรับอากาศ|ระบบปรับอากาศ|ล้างแอร์|ซ่อมแอร์|暖通|空调/g, " hvac ")
    .replace(/\b(?:air\s*conditioning|air\s*con|aircon|a\/c|ac|hvac|air\s*conditioner|airconditioner)\b/g, " hvac ")
    .replace(/\u0e2b\u0e25\u0e31\u0e07\u0e04\u0e32|\u0e21\u0e38\u0e07\u0e2b\u0e25\u0e31\u0e07\u0e04\u0e32|\u0e2b\u0e25\u0e31\u0e07\u0e04\u0e32\u0e23\u0e31\u0e48\u0e27|\u0e01\u0e31\u0e19\u0e0b\u0e36\u0e21|\u0e23\u0e31\u0e48\u0e27\u0e0b\u0e36\u0e21/g, " roofing ")
    .replace(/\b(?:roof\s*leak|roof(?:ing)?|waterproof(?:ing)?|leak\s*repair)\b/g, " roofing ")
    .replace(/\u0e17\u0e32\u0e2a\u0e35|\u0e2a\u0e35\u0e1c\u0e19\u0e31\u0e07|\u0e07\u0e32\u0e19\u0e2a\u0e35/g, " painting ")
    .replace(/\b(?:paint(?:ing)?|repaint(?:ing)?|wall\s*paint)\b/g, " painting ")
    .replace(/\u0e1b\u0e39\u0e01\u0e23\u0e30\u0e40\u0e1a\u0e37\u0e49\u0e2d\u0e07|\u0e01\u0e23\u0e30\u0e40\u0e1a\u0e37\u0e49\u0e2d\u0e07/g, " tiling ")
    .replace(/\b(?:tile|tiles|tiling)\b/g, " tiling ")
    .replace(/\u0e0a\u0e48\u0e32\u0e07\u0e44\u0e21\u0e49|\u0e07\u0e32\u0e19\u0e44\u0e21\u0e49/g, " carpentry ")
    .replace(/\b(?:carpenter|carpentry|woodwork|wood\s*work)\b/g, " carpentry ")
    .replace(/\u0e40\u0e2b\u0e25\u0e47\u0e01|\u0e07\u0e32\u0e19\u0e40\u0e2b\u0e25\u0e47\u0e01|\u0e40\u0e0a\u0e37\u0e48\u0e2d\u0e21/g, " steel ")
    .replace(/\b(?:steel|metal|welding|welder|ironwork|metalwork)\b/g, " steel ")
    .replace(/\u0e01\u0e23\u0e30\u0e08\u0e01|\u0e2d\u0e25\u0e39\u0e21\u0e34\u0e40\u0e19\u0e35\u0e22\u0e21/g, " glass aluminium ")
    .replace(/\b(?:glass|aluminium|aluminum|alum(?:inium)?|partition)\b/g, " glass aluminium ")
    .replace(/\u0e17\u0e33\u0e04\u0e27\u0e32\u0e21\u0e2a\u0e30\u0e2d\u0e32\u0e14|\u0e41\u0e21\u0e48\u0e1a\u0e49\u0e32\u0e19/g, " cleaning ")
    .replace(/\b(?:clean(?:ing)?|maid|housekeep(?:ing)?)\b/g, " cleaning ")
    .replace(/\u0e1b\u0e25\u0e27\u0e01|\u0e01\u0e33\u0e08\u0e31\u0e14\u0e1b\u0e25\u0e27\u0e01/g, " pest control ")
    .replace(/\b(?:pest|termite|exterminat(?:e|ion))\b/g, " pest control ")
    .replace(/\u0e02\u0e19\u0e22\u0e49\u0e32\u0e22|\u0e22\u0e49\u0e32\u0e22\u0e1a\u0e49\u0e32\u0e19/g, " moving ")
    .replace(/\b(?:moving|relocation|mover|transport)\b/g, " moving ")
    .replace(/พัฒนาเว็บไซต์|ทำเว็บ|เขียนเว็บ|เว็บไซต์|เว็บแอป|网站开发|网页设计/g, " website ")
    .replace(/\b(?:web\s*site|web\s*page|webpage|web\s*dev|webdev|webiste|webstie|wordpress|ecommerce|e-commerce|landing\s*page)\b/g, " website ")
    .replace(/\b(?:chat\s*bot|chat\s*boot|chatbt|chatboot|faq\s*bot)\b/g, " chatbot ")
    .replace(/\b(?:mobile\s*app|app\s*dev|application|ios|android)\b/g, " app ")
    .replace(/\b(?:software|saas|api|backend|frontend|program(?:ming|mer))\b/g, " software ")
    .replace(/\b(?:ai|a\.i\.|automation|machine\s*learning|ml|data\s*analytics|dashboard)\b/g, " ai automation ")
    .replace(/\b(?:digital\s*marketing|seo|sem|ads?|advert(?:ising)?|campaign|social\s*media|facebook\s*ads?|google\s*ads?|content|branding)\b/g, " marketing ")
    .replace(/\b(?:legal|lawyer|law|contract|compliance|permit|license)\b/g, " legal ")
    .replace(/\b(?:account(?:ing|ant)?|bookkeep(?:ing)?|tax|audit|auditor|cpa)\b/g, " accounting audit ")
    .replace(/\b(?:architect|architecture|interior\s*designer|engineer|engineering|structural|civil|mechanical|mep)\b/g, " professional design ")
    .replace(/\b(?:safety\s*officer|safety|hse|ehs)\b/g, " safety officer ")
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
