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

  // Household services (matches web)
  static const Map<String, List<String>> householdServices = {
    'en': ['Plumbing', 'Electrical', 'Air Conditioning', 'Interior Design', 'Landscaping', 'Cladding/Roofing'],
    'th': ['ประปา', 'ไฟฟ้า', 'แอร์', 'ออกแบบภายใน', 'จัดสวน', 'หลังคา/ผนัง'],
    'zh': ['水管', '电气', '空调', '室内设计', '园林绿化', '屋顶/外墙'],
  };

  // Project services (matches web)
  static const Map<String, List<String>> projectServices = {
    'en': ['Website Development', 'Mobile App Development', 'AI Integration', 'Software Development', 'Machine Learning', 'Consulting', 'Solar Panels', 'EV Charging', 'Green Building Design', 'HVAC MEP & Retrofit', 'Kitchen', 'Reinstatement', 'Fit-out', 'Automation', 'Environmental Services', 'Security and CCTV', 'Door and Access Control', 'Green Construction', 'Smart Home/Building & BMS', 'Smart Farming'],
    'th': ['พัฒนาเว็บไซต์', 'พัฒนาแอปมือถือ', 'บูรณาการ AI', 'พัฒนาซอฟต์แวร์', 'แมชชีนเลิร์นนิ่ง', 'ที่ปรึกษา', 'แผงโซลาร์', 'สถานีชาร์จ EV', 'ออกแบบอาคารสีเขียว', 'ระบบปรับอากาศ MEP', 'ครัว', 'คืนสภาพ', 'ตกแต่ง', 'ระบบอัตโนมัติ', 'บริการสิ่งแวดล้อม', 'กล้องวงจรปิด', 'ระบบประตู', 'ก่อสร้างสีเขียว', 'สมาร์ทโฮม/BMS', 'เกษตรอัจฉริยะ'],
    'zh': ['网站开发', '移动应用开发', 'AI集成', '软件开发', '机器学习', '咨询', '太阳能板', 'EV充电', '绿色建筑设计', 'HVAC MEP', '厨房', '恢复', '装修', '自动化', '环境服务', '安防监控', '门禁系统', '绿色施工', '智能家居/BMS', '智慧农业'],
  };

  // Professional services (matches web)
  static const Map<String, List<String>> professionalServices = {
    'en': ['Lawyer', 'Accountant', 'CPA', 'Architect', 'Interior Designer', 'Design Civil Engineer', 'Construction Civil Engineer', 'Design Mechanical Engineer', 'Construction Mechanical Engineer', 'Design Electrical Engineer', 'Construction Electrical Engineer', 'Software Programmer', 'Digital Marketing', 'Safety Officer', 'Others'],
    'th': ['ทนายความ', 'นักบัญชี', 'ผู้สอบบัญชี', 'สถาปนิก', 'นักออกแบบภายใน', 'วิศวกรโยธาออกแบบ', 'วิศวกรโยธาก่อสร้าง', 'วิศวกรเครื่องกลออกแบบ', 'วิศวกรเครื่องกลก่อสร้าง', 'วิศวกรไฟฟ้าออกแบบ', 'วิศวกรไฟฟ้าก่อสร้าง', 'โปรแกรมเมอร์', 'การตลาดดิจิทัล', 'เจ้าหน้าที่ความปลอดภัย', 'อื่นๆ'],
    'zh': ['律师', '会计师', '注册会计师', '建筑师', '室内设计师', '设计土木工程师', '施工土木工程师', '设计机械工程师', '施工机械工程师', '设计电气工程师', '施工电气工程师', '软件程序员', '数字营销', '安全官', '其他'],
  };

  // All services combined (for unified partner registration)
  static Map<String, List<String>> get allServices {
    return {
      'en': [...householdServices['en']!, ...projectServices['en']!, ...professionalServices['en']!],
      'th': [...householdServices['th']!, ...projectServices['th']!, ...professionalServices['th']!],
      'zh': [...householdServices['zh']!, ...projectServices['zh']!, ...professionalServices['zh']!],
    };
  }

  // Property types
  static const List<String> propertyTypes = [
    'Condo', 'House & Villa', 'Townhouse', 'Land', 'Commercial', 'Warehouse & Factory',
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
