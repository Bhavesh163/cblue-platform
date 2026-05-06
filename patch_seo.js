const fs = require('fs');

const engKeywords = "Cblue, home repair, find a handyman, professional, find a professional, safety officer, find a safety officer, annual inspection, supervising engineer, find a supervising engineer, auditor, find an auditor, designer, find a designer, house for sale, condo for sale, warehouse for sale, land for sale, factory for sale, building for sale, house, condo, warehouse, land, factory, building, office, house for rent, condo for rent, warehouse for rent, land for rent, factory for rent, building for rent, second-hand house, second-hand condo, second-hand warehouse, second-hand land, second-hand factory, second-hand building, rent a house, rent a condo, rent a warehouse, rent land, rent a factory, rent a building, rent an office, find a townhouse, townhouse for rent, second-hand townhouse, buy a townhouse, sell a townhouse";

const chineseKeywords = "Cblue, 房屋维修, 找维修工, 专业人士, 找专业人士, 安全员, 找安全员, 年度检查, 监理工程师, 找监理工程师, 审计师, 找审计师, 设计师, 找设计师, 房屋出售, 公寓出售, 仓库出售, 土地出售, 工厂出售, 建筑出售, 房屋, 公寓, 仓库, 土地, 工厂, 建筑, 办公室, 房屋出租, 公寓出租, 仓库出租, 土地出租, 工厂出租, 建筑出租, 二手房, 二手公寓, 二手仓库, 二手土地, 二手工厂, 二手建筑, 租房, 租公寓, 租仓库, 租土地, 租工厂, 租建筑, 租办公室, 找联排别墅, 联排别墅出租, 二手联排别墅, 买联排别墅, 卖联排别墅, 律师, 会计师, 注册会计师, 建筑师, 室内设计师, 土木设计工程师, 建筑土木工程师, 机械设计工程师, 建筑机械工程师, 电气设计工程师, 建筑电气工程师, 软件程序员, 数字营销, 安全经理, HSE经理, 消防与生命安全, FLS, 找律师, 找会计师, 找注册会计师, 找建筑师, 找室内设计师, 找土木设计工程师, 找建筑土木工程师, 找机械设计工程师, 找建筑机械工程师, 找电气设计工程师, 找建筑电气工程师, 找软件程序员, 找数字营销, 找安全经理, 找HSE经理, 找消防与生命安全, 找FLS";

const thaiKeywords = "Cblue, ซีบลู, ช่างซ่อมบ้าน, หาช่างซ่อมบ้าน, มืออาชีพ, หามืออาชีพ, เจ้าหน้าที่ความปลอดภัย, หาเจ้าหน้าที่ความปลอดภัย, ตรวจประจำปี, วิศวกรกรควบคุมงาน, หาวิศวกรกรควบคุมงาน, ผู้ตรวจสอบบัญชี, หาผู้ตรวจสอบบัญชี, ผู้ออกแบบ, หาผู้ออกแบบ, ขายบ้าน, ขายคอนโด, ขายโกดัง, ขายที่ดิน, ขายโรงงาน, ขายอาคาร, บ้าน, คอนโด, โกดัง, ที่ดิน, โรงงาน, อาคาร, ออฟฟิศ, บ้านให้เช่า, คอนโดให้เช่า, โกดังให้เช่า, ที่ดินให้เช่า, โรงงานให้เช่า, อาคารให้เช่า, บ้านมื่อสอง, คอนโดมื่อสอง, โกดังมื่อสอง, ที่ดินมื่อสอง, โรงงานมื่อสอง, อาคารมื่อสอง, เช่าบ้าน, เช่าคอนโด, เช่าโกดัง, เช่าที่ดิน, เช่าโรงงาน, เช่าอาคาร, เช่าออฟฟิศ, หาทาวน์เฮ้าส์, ทาวน์เฮ้าส์ให้เช่า, ทาวน์เฮ้าส์มื่อสอง, ซื้อทาวน์เฮ้าส์, ขายทาวน์เฮ้าส์, ทนายความ, นักบัญชี, ผู้สอบบัญชีรับอนุญาต, สถาปนิก, มัณฑนากร, วิศวกรออกแบบโยธา, วิศวกรก่อสร้างโยธา, วิศวกรออกแบบเครื่องกล, วิศวกรก่อสร้างเครื่องกล, วิศวกรออกแบบไฟฟ้า, วิศวกรก่อสร้างไฟฟ้า, โปรแกรมเมอร์ซอฟต์แวร์, การตลาดดิจิทัล, ผู้จัดการด้านความปลอดภัย, ผู้จัดการ HSE, ความปลอดภัยจากอัคคีภัย, FLS, หาทนายความ, หานักบัญชี, หาผู้สอบบัญชีรับอนุญาต, หาสถาปนิก, หามัณฑนากร, หาวิศวกรออกแบบโยธา, หาวิศวกรก่อสร้างโยธา, หาวิศวกรออกแบบเครื่องกล, หาวิศวกรก่อสร้างเครื่องกล, หาวิศวกรออกแบบไฟฟ้า, หาวิศวกรก่อสร้างไฟฟ้า, หาโปรแกรมเมอร์ซอฟต์แวร์, หาการตลาดดิจิทัล, หาผู้จัดการด้านความปลอดภัย, หาผู้จัดการ HSE, หาความปลอดภัยจากอัคคีภัย, หา FLS";

const layoutPath = 'apps/web/app/[locale]/layout.tsx';
if (fs.existsSync(layoutPath)) {
  let content = fs.readFileSync(layoutPath, 'utf8');
  content = content.replace(/keywords: \[.*?\],/s, `keywords: [\n    "${engKeywords.split(', ').join('", "')}",\n    "${chineseKeywords.split(', ').join('", "')}",\n    "${thaiKeywords.split(', ').join('", "')}"\n  ],`);
  
  // Remove restricted terms
  content = content.replace(/12 steps|8 steps|Typhoon|Typhoon-v2.5-30b-a3b|Typhoon OCR playground|Cloudflare/g, '');
  
  fs.writeFileSync(layoutPath, content);
  console.log("SEO keywords updated.");
} else {
  console.log("layout.tsx not found");
}
