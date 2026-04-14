class AppConstants {
  static const String apiBase = 'http://10.0.2.2:3002/api/v1';
  static const String appName = 'CBLUE Partner';

  // Fixer tiers
  static const List<String> fixerTiers = ['Economy', 'Standard', 'Corporate', 'Specialist', 'Expert'];
  static const List<String> proTiers = ['Economy', 'Standard', 'Corporate', 'Manager', 'Director'];
  static const List<String> propertyTiers = ['Economy', 'Standard', 'Upper', 'Luxury', 'Grandeur'];

  // Tier processing fees (Baht)
  static const Map<String, double> tierFees = {
    'Economy': 200.0,
    'Standard': 400.0,
    'Corporate': 600.0,
    'Specialist': 800.0,
    'Manager': 800.0,
    'Upper': 600.0,
    'Luxury': 800.0,
    'Expert': 1000.0,
    'Director': 1000.0,
    'Grandeur': 1000.0,
  };

  // Household services
  static const Map<String, List<String>> householdServices = {
    'en': ['Plumbing', 'Electrical', 'Air Conditioning', 'Painting', 'Cleaning', 'General Maintenance'],
    'th': ['ประปา', 'ไฟฟ้า', 'แอร์', 'ทาสี', 'ทำความสะอาด', 'ซ่อมบำรุงทั่วไป'],
    'zh': ['水管', '电气', '空调', '油漆', '清洁', '一般维修'],
  };

  // Project services
  static const Map<String, List<String>> projectServices = {
    'en': ['Architect', 'Interior Designer', 'Structural Engineer', 'Landscape Designer', 'MEP Engineer', 'Quantity Surveyor', 'Project Manager', 'Contractor (Renovation)', 'Contractor (New Build)', 'Contractor (Fit-out)', 'Roofing Specialist', 'Waterproofing', 'Foundation Specialist', 'Steel Fabricator', 'Glass & Aluminium', 'HVAC Specialist', 'Fire Protection', 'Security Systems', 'Smart Home', 'Solar Installation'],
    'th': ['สถาปนิก', 'มัณฑนากร', 'วิศวกรโครงสร้าง', 'ภูมิสถาปนิก', 'วิศวกร MEP', 'ปริมาณสำรวจ', 'ผู้จัดการโครงการ', 'ผู้รับเหมา (ปรับปรุง)', 'ผู้รับเหมา (สร้างใหม่)', 'ผู้รับเหมา (ตกแต่ง)', 'ช่างหลังคา', 'กันซึม', 'ช่างฐานราก', 'ช่างเหล็ก', 'กระจก & อลูมิเนียม', 'ช่าง HVAC', 'ระบบดับเพลิง', 'ระบบรักษาความปลอดภัย', 'สมาร์ทโฮม', 'ติดตั้งโซลาร์'],
    'zh': ['建筑师', '室内设计师', '结构工程师', '景观设计师', 'MEP工程师', '工料测量师', '项目经理', '承包商（翻新）', '承包商（新建）', '承包商（装修）', '屋顶专家', '防水', '地基专家', '钢铁制造', '玻璃与铝材', 'HVAC专家', '消防', '安防系统', '智能家居', '太阳能安装'],
  };

  // Professional services
  static const Map<String, List<String>> professionalServices = {
    'en': ['Real Estate Agent', 'Property Valuator', 'Mortgage Broker', 'Legal Advisor', 'Tax Consultant', 'Insurance Agent', 'Home Inspector', 'Feng Shui Consultant', 'Moving Service', 'Pest Control', 'Garden Maintenance', 'Pool Maintenance', 'Security Guard', 'Property Manager', 'Facility Manager'],
    'th': ['นายหน้าอสังหาฯ', 'ผู้ประเมินทรัพย์สิน', 'นายหน้าสินเชื่อ', 'ที่ปรึกษากฎหมาย', 'ที่ปรึกษาภาษี', 'ตัวแทนประกัน', 'ผู้ตรวจสอบบ้าน', 'ที่ปรึกษาฮวงจุ้ย', 'บริการขนย้าย', 'กำจัดแมลง', 'ดูแลสวน', 'ดูแลสระว่ายน้ำ', 'รปภ.', 'ผู้จัดการอสังหาฯ', 'ผู้จัดการอาคาร'],
    'zh': ['房产经纪人', '房产评估师', '抵押贷款经纪人', '法律顾问', '税务顾问', '保险代理', '房屋检查员', '风水顾问', '搬家服务', '害虫防治', '花园维护', '泳池维护', '保安', '物业经理', '设施经理'],
  };

  // Property types
  static const List<String> propertyTypes = [
    'Condo', 'House', 'Townhouse', 'Land', 'Commercial', 'Apartment',
  ];

  // Listing types
  static const List<String> listingTypes = ['SALE', 'RENT'];

  // Job statuses
  static const Map<String, Map<String, String>> statusLabels = {
    'pending': {'en': 'Pending', 'th': 'รอดำเนินการ', 'zh': '待处理'},
    'matching': {'en': 'Matching', 'th': 'กำลังจับคู่', 'zh': '匹配中'},
    'confirmed': {'en': 'Confirmed', 'th': 'ยืนยันแล้ว', 'zh': '已确认'},
    'in_progress': {'en': 'In Progress', 'th': 'กำลังดำเนินการ', 'zh': '进行中'},
    'completed': {'en': 'Completed', 'th': 'เสร็จสิ้น', 'zh': '已完成'},
    'cancelled': {'en': 'Cancelled', 'th': 'ยกเลิก', 'zh': '已取消'},
    'active': {'en': 'Active', 'th': 'ใช้งาน', 'zh': '活跃'},
    'inactive': {'en': 'Inactive', 'th': 'ไม่ใช้งาน', 'zh': '未活跃'},
  };
}
