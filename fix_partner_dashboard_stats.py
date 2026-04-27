with open('apps/web/app/[locale]/fixers/page.tsx', 'r') as f:
    content = f.read()

# Zero out partner stats DEMO_PARTNER_STATS
old_stats = """const DEMO_PARTNER_STATS = {
  activeJobs: 3,
  completedJobs: 47,
  monthlyEarnings: "฿18,500",
  rating: 4.8,
  responseRate: "96%",
  repeatClients: 12,
};"""

new_stats = """const DEMO_PARTNER_STATS = {
  activeJobs: 0,
  completedJobs: 0,
  monthlyEarnings: "฿0",
  rating: 0,
  responseRate: "0%",
  repeatClients: 0,
};"""
content = content.replace(old_stats, new_stats)

old_prop = """const DEMO_PROPERTY_LISTINGS = [
  { id: "p1", title: "Condo Sukhumvit 21", titleTh: "คอนโดสุขุมวิท 21", titleZh: "素坤逸21号公寓", description: "Modern condo near BTS, 2 bed 2 bath, city view", descriptionTh: "คอนโดใกล้ BTS 2 ห้องนอน 2 ห้องน้ำ วิวเมือง", descriptionZh: "近BTS的现代公寓，2卧室2卫，城市景观", type: "CONDO", listingType: "SALE", price: "฿5,500,000", status: "active", province: "กรุงเทพมหานคร", views: 234, inquiries: 12, updatedAt: "2026-04-08", images: ["/images/scenic-building.jpg", "/images/scenic-house.jpg"] },
  { id: "p2", title: "House Rama 9", titleTh: "บ้านพระราม 9", titleZh: "拉玛9号别墅", description: "3-storey house with pool, 4 bed 5 bath", descriptionTh: "บ้าน 3 ชั้น มีสระว่ายน้ำ 4 ห้องนอน 5 ห้องน้ำ", descriptionZh: "3层别墅带泳池，4卧室5卫", type: "HOUSE", listingType: "RENT", price: "฿35,000/mo", status: "active", province: "กรุงเทพมหานคร", views: 156, inquiries: 8, updatedAt: "2026-04-05", images: ["/images/scenic-house.jpg"] },
  { id: "p3", title: "Townhouse Bangna", titleTh: "ทาวน์เฮ้าส์บางนา", titleZh: "邦纳联排别墅", description: "Corner townhouse, 3 bed, near expressway", descriptionTh: "ทาวน์เฮ้าส์มุม 3 ห้องนอน ใกล้ทางด่วน", descriptionZh: "转角联排别墅，3卧室，近高速公路", type: "TOWNHOUSE", listingType: "SALE", price: "฿3,200,000", status: "pending", province: "สมุทรปราการ", views: 45, inquiries: 2, updatedAt: "2026-04-01", images: [] },
];"""

new_prop = """const DEMO_PROPERTY_LISTINGS: any[] = [];"""
content = content.replace(old_prop, new_prop)

with open('apps/web/app/[locale]/fixers/page.tsx', 'w') as f:
    f.write(content)
