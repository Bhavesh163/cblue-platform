import json
import re

new_keywords_th_zh = [
    "ช่างซ่อมบ้าน", "หาช่างซ่อมบ้าน", "มืออาชีพ", "หามืออาชีพ", "เจ้าหน้าที่ความปลอดภัย", "หาเจ้าหน้าที่ความปลอดภัย", "ตรวจประจำปี", "วิศวกรกรควบคุมงาน", "หาวิศวกรกรควบคุมงาน", "ผู้ตรวจสอบบัญชี", "หาผู้ตรวจสอบบัญชี", "ผู้ออกแบบ", "หาผู้ออกแบบ", "ขายบ้าน", "ขายคอนโด", "ขายโกดัง", "ขายที่ดิน", "ขายโรงงาน", "ขายอาคาร", "บ้าน", "คอนโด", "โกดัง", "ที่ดิน", "โรงงาน", "อาคาร", "ออฟฟิศ", "บ้านให้เช่า", "คอนโดให้เช่า", "โกดังให้เช่า", "ที่ดินให้เช่า", "โรงงานให้เช่า", "อาคารให้เช่า", "บ้านมื่อสอง", "คอนโดมื่อสอง", "โกดังมื่อสอง", "ที่ดินมื่อสอง", "โรงงานมื่อสอง", "อาคารมื่อสอง", "ออฟฟิศ", "ออฟฟิศ", "เช่าบ้าน", "เช่าคอนโด", "เช่าโกดัง", "เช่าที่ดิน", "เช่าโรงงาน", "เช่าอาคาร", "เช่าออฟฟิศ", "หาทาวน์เฮ้าส์", "ทาวน์เฮ้าส์ให้เช่า", "ทาวน์เฮ้าส์มื่อสอง", "ซื้อทาวน์เฮ้าส์", "ขายทาวน์เฮ้าส์",
    "房屋维修", "找维修工", "专业人士", "找专业人士", "安全员", "找安全员", "年度检查", "监理工程师", "找监理工程师", "审计师", "找审计师", "设计师", "找设计师", "卖房", "卖公寓", "卖仓库", "卖土地", "卖工厂", "卖建筑", "房子", "公寓", "仓库", "土地", "工厂", "建筑", "办公室", "房屋出租", "公寓出租", "仓库出租", "土地出租", "工厂出租", "建筑出租", "二手房", "二手公寓", "二手仓库", "二手土地", "二手工厂", "二手建筑", "办公室出租", "找联排别墅", "联排别墅出租", "二手联排别墅", "买联排别墅", "卖联排别墅",
    "Lawyer", "accountant", "CPA", "Architect", "Interior Designer", "Design Civil Engineer", "Construction Civil Engineer", "Design Mechanical Engineer", "Construction Mechanical Engineer", "Design Electrical Engineer", "Construction Electrical Engineer", "Software Programer", "Digital Marketing", "Safety manager", "HSE manager", "firelifesafety", "FLS", "Lawyer search", "accountant  search", "CPA search", "Architect search", "Interior Designer search", "Design Civil Engineer search", "Construction Civil Engineer search", "Design Mechanical Engineer", "Construction Mechanical Engineer", "Design Electrical Engineer", "Construction Electrical Engineer", "Software Programer", "Digital Marketing search", "Safety manager search", "HSE manager search", "firelifesafety search", "FLS search",
    "ทนายความ", "นักบัญชี", "ผู้สอบบัญชี", "สถาปนิก", "มัณฑนากร", "วิศวกรโยธาออกแบบ", "วิศวกรโยธาควบคุมงาน", "วิศวกรเครื่องกลออกแบบ", "วิศวกรเครื่องกลควบคุมงาน", "วิศวกรไฟฟ้าออกแบบ", "วิศวกรไฟฟ้าควบคุมงาน", "โปรแกรมเมอร์", "การตลาดดิจิทัล", "ผู้จัดการความปลอดภัย", "ผู้จัดการ HSE", "ความปลอดภัยจากอัคคีภัย", "ค้นหาทนายความ", "ค้นหานักบัญชี", "ค้นหาผู้สอบบัญชี", "ค้นหาสถาปนิก", "ค้นหามัณฑนากร", "ค้นหาวิศวกรโยธาออกแบบ", "ค้นหาวิศวกรโยธาควบคุมงาน", "ค้นหาโปรแกรมเมอร์", "ค้นหาการตลาดดิจิทัล", "ค้นหาผู้จัดการความปลอดภัย", "ค้นหาผู้จัดการ HSE"
]

layout_file = "apps/web/app/[locale]/layout.tsx"
with open(layout_file, "r") as f:
    content = f.read()

# Instead of blindly replacing, let's just insert them nicely.
keywords_str = '", "'.join(set(new_keywords_th_zh))
insertion = f'    "{keywords_str}",'

# Find the keywords array in metadata
content = re.sub(r'keywords: \[', f'keywords: [\n{insertion}', content)

with open(layout_file, "w") as f:
    f.write(content)
