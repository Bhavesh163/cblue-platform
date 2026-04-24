import json

list1_th = [
"ช่างซ่อมบ้าน", "หาช่างซ่อมบ้าน", "มืออาชีพ", "หามืออาชีพ", "เจ้าหน้าที่ความปลอดภัย", "หาเจ้าหน้าที่ความปลอดภัย", "ตรวจประจำปี", "วิศวกรกรควบคุมงาน", "หาวิศวกรกรควบคุมงาน", "ผู้ตรวจสอบบัญชี", "หาผู้ตรวจสอบบัญชี", "ผู้ออกแบบ", "หาผู้ออกแบบ", "ขายบ้าน", "ขายคอนโด", "ขายโกดัง", "ขายที่ดิน", "ขายโรงงาน", "ขายอาคาร", "บ้าน", "คอนโด", "โกดัง", "ที่ดิน", "โรงงาน", "อาคาร", "ออฟฟิศ", "บ้านให้เช่า", "คอนโดให้เช่า", "โกดังให้เช่า", "ที่ดินให้เช่า", "โรงงานให้เช่า", "อาคารให้เช่า", "บ้านมื่อสอง", "คอนโดมื่อสอง", "โกดังมื่อสอง", "ที่ดินมื่อสอง", "โรงงานมื่อสอง", "อาคารมื่อสอง", "ออฟฟิศ", "ออฟฟิศ", "เช่าบ้าน", "เช่าคอนโด", "เช่าโกดัง", "เช่าที่ดิน", "เช่าโรงงาน", "เช่าอาคาร", "เช่าออฟฟิศ", "หาทาวน์เฮ้าส์", "ทาวน์เฮ้าส์ให้เช่า", "ทาวน์เฮ้าส์มื่อสอง", "ซื้อทาวน์เฮ้าส์", "ขายทาวน์เฮ้าส์"
]

list1_en = [
"Home repairman", "Find home repairman", "Professional", "Find professional", "Safety officer", "Find safety officer", "Annual inspection", "Site engineer", "Find site engineer", "Auditor", "Find auditor", "Designer", "Find designer", "House for sale", "Condo for sale", "Warehouse for sale", "Land for sale", "Factory for sale", "Building for sale", "House", "Condo", "Warehouse", "Land", "Factory", "Building", "Office", "House for rent", "Condo for rent", "Warehouse for rent", "Land for rent", "Factory for rent", "Building for rent", "Second-hand house", "Second-hand condo", "Second-hand warehouse", "Second-hand land", "Second-hand factory", "Second-hand building", "Rent house", "Rent condo", "Rent warehouse", "Rent land", "Rent factory", "Rent building", "Rent office", "Find townhouse", "Townhouse for rent", "Second-hand townhouse", "Buy townhouse", "Sell townhouse"
]

list1_zh = [
"房屋维修工", "找房屋维修工", "专业人士", "找专业人士", "安全员", "找安全员", "年度检查", "现场工程师", "找现场工程师", "审计师", "找审计师", "设计师", "找设计师", "房屋出售", "公寓出售", "仓库出售", "土地出售", "工厂出售", "建筑出售", "房屋", "公寓", "仓库", "土地", "工厂", "建筑", "办公室", "房屋出租", "公寓出租", "仓库出租", "土地出租", "工厂出租", "建筑出租", "二手房", "二手公寓", "二手仓库", "二手土地", "二手工厂", "二手建筑", "租房", "租公寓", "租仓库", "租土地", "租工厂", "租建筑", "租办公室", "找联排别墅", "联排别墅出租", "二手联排别墅", "购买联排别墅", "出售联排别墅"
]

list2_en = [
"Lawyer", "accountant", "CPA", "Architect", "Interior Designer", "Design Civil Engineer", "Construction Civil Engineer", "Design Mechanical Engineer", "Construction Mechanical Engineer", "Design Electrical Engineer", "Construction Electrical Engineer", "Software Programer", "Digital Marketing", "Safety manager", "HSE manager", "firelifesafety", "FLS", "Lawyer search", "accountant search", "CPA search", "Architect search", "Interior Designer search", "Design Civil Engineer search", "Construction Civil Engineer search", "Design Mechanical Engineer", "Construction Mechanical Engineer", "Design Electrical Engineer", "Construction Electrical Engineer", "Software Programer", "Digital Marketing search", "Safety manager search", "HSE manager search", "firelifesafety search", "FLS search"
]

list2_th = [
"ทนายความ", "นักบัญชี", "ผู้สอบบัญชีรับอนุญาต", "สถาปนิก", "มัณฑนากร", "วิศวกรโยธาออกแบบ", "วิศวกรโยธาควบคุมงาน", "วิศวกรเครื่องกลออกแบบ", "วิศวกรเครื่องกลควบคุมงาน", "วิศวกรไฟฟ้าออกแบบ", "วิศวกรไฟฟ้าควบคุมงาน", "โปรแกรมเมอร์", "การตลาดดิจิทัล", "ผู้จัดการความปลอดภัย", "ผู้จัดการอาชีวอนามัย", "ความปลอดภัยด้านอัคคีภัย", "FLS", "หาทนายความ", "หานักบัญชี", "หาผู้สอบบัญชีรับอนุญาต", "หาสถาปนิก", "หามัณฑนากร", "หาวิศวกรโยธาออกแบบ", "หาวิศวกรโยธาควบคุมงาน", "หาวิศวกรเครื่องกลออกแบบ", "หาวิศวกรเครื่องกลควบคุมงาน", "หาวิศวกรไฟฟ้าออกแบบ", "หาวิศวกรไฟฟ้าควบคุมงาน", "หาโปรแกรมเมอร์", "หาการตลาดดิจิทัล", "หาผู้จัดการความปลอดภัย", "หาผู้จัดการอาชีวอนามัย", "หาความปลอดภัยด้านอัคคีภัย", "หา FLS"
]

list2_zh = [
"律师", "会计师", "注册会计师", "建筑师", "室内设计师", "设计土木工程师", "施工土木工程师", "设计机械工程师", "施工机械工程师", "设计电气工程师", "施工电气工程师", "软件程序员", "数字营销", "安全经理", "健康安全环境经理", "消防生命安全", "FLS", "找律师", "找会计师", "找注册会计师", "找建筑师", "找室内设计师", "找设计土木工程师", "找施工土木工程师", "找设计机械工程师", "找施工机械工程师", "找设计电气工程师", "找施工电气工程师", "找软件程序员", "找数字营销", "找安全经理", "找健康安全环境经理", "找消防生命安全", "找FLS"
]

all_k = list1_th + list1_en + list1_zh + list2_en + list2_th + list2_zh
all_k = list(set([k.strip() for k in all_k if k.strip()]))
print(json.dumps(all_k, ensure_ascii=False, indent=2))
