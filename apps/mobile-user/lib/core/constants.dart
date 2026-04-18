class AppConstants {
  static const String appName = 'Cblue';

  // API URLs — use --dart-define=ENV=prod for production builds
  static const String _env = String.fromEnvironment('ENV', defaultValue: 'dev');
  static const String apiBaseUrl = _env == 'prod'
      ? 'https://api.cblue.co.th/api/v1'
      : 'http://10.0.2.2:3002/api/v1';
  static const String webBaseUrl = _env == 'prod'
      ? 'https://cblue.co.th'
      : 'http://10.0.2.2:3000';

  // Tiers
  static const List<String> fixerTiers = ['Economy', 'Standard', 'Corporate', 'Specialist', 'Expert'];
  static const List<String> proTiers = ['Economy', 'Standard', 'Corporate', 'Manager', 'Director'];
  static const List<String> propertyTiers = ['Economy', 'Standard', 'Upper', 'Luxury', 'Grandeur'];

  // Processing fees per tier (Baht)
  static const Map<String, int> tierFees = {
    'Economy': 200,
    'Standard': 400,
    'Corporate': 600,
    'Specialist': 800,
    'Manager': 800,
    'Upper': 600,
    'Luxury': 800,
    'Expert': 1000,
    'Director': 1000,
    'Grandeur': 1000,
  };

  // Household services
  static const List<Map<String, String>> householdServices = [
    {'en': 'Plumbing', 'th': 'ประปา', 'zh': '水管'},
    {'en': 'Electrical', 'th': 'ไฟฟ้า', 'zh': '电气'},
    {'en': 'Air Conditioning', 'th': 'แอร์', 'zh': '空调'},
    {'en': 'Interior Design', 'th': 'ออกแบบภายใน', 'zh': '室内设计'},
    {'en': 'Landscaping', 'th': 'จัดสวน', 'zh': '园林绿化'},
    {'en': 'Cladding/Roofing', 'th': 'หลังคา', 'zh': '屋顶'},
  ];

  // Project services
  static const List<Map<String, String>> projectServices = [
    {'en': 'Website Development', 'th': 'พัฒนาเว็บไซต์', 'zh': '网站开发'},
    {'en': 'Mobile App Development', 'th': 'พัฒนาแอป', 'zh': '移动应用开发'},
    {'en': 'AI Integration', 'th': 'บูรณาการ AI', 'zh': 'AI集成'},
    {'en': 'Software Development', 'th': 'พัฒนาซอฟต์แวร์', 'zh': '软件开发'},
    {'en': 'Machine Learning', 'th': 'แมชชีนเลิร์นนิ่ง', 'zh': '机器学习'},
    {'en': 'Consulting', 'th': 'ที่ปรึกษา', 'zh': '咨询'},
    {'en': 'Solar Panels', 'th': 'แผงโซลาร์', 'zh': '太阳能板'},
    {'en': 'EV Charging', 'th': 'สถานีชาร์จ EV', 'zh': 'EV充电'},
    {'en': 'Green Building Design', 'th': 'ออกแบบอาคารสีเขียว', 'zh': '绿色建筑设计'},
    {'en': 'HVAC MEP & Retrofit', 'th': 'HVAC MEP', 'zh': 'HVAC MEP'},
    {'en': 'Kitchen', 'th': 'ครัว', 'zh': '厨房'},
    {'en': 'Reinstatement', 'th': 'คืนสภาพ', 'zh': '恢复'},
    {'en': 'Fit-out', 'th': 'ตกแต่ง', 'zh': '装修'},
    {'en': 'Automation', 'th': 'ระบบอัตโนมัติ', 'zh': '自动化'},
    {'en': 'Environmental Services', 'th': 'สิ่งแวดล้อม', 'zh': '环境服务'},
    {'en': 'Security and CCTV', 'th': 'กล้องวงจรปิด', 'zh': '安防监控'},
    {'en': 'Door and Access Control', 'th': 'ระบบประตู', 'zh': '门禁系统'},
    {'en': 'Green Construction', 'th': 'ก่อสร้างสีเขียว', 'zh': '绿色施工'},
    {'en': 'Smart Home/Building & BMS', 'th': 'สมาร์ทโฮม', 'zh': '智能家居'},
    {'en': 'Smart Farming', 'th': 'เกษตรอัจฉริยะ', 'zh': '智慧农业'},
  ];

  // Professional services
  static const List<Map<String, String>> professionalServices = [
    {'en': 'Lawyer', 'th': 'ทนายความ', 'zh': '律师'},
    {'en': 'Accountant', 'th': 'นักบัญชี', 'zh': '会计师'},
    {'en': 'CPA', 'th': 'ผู้สอบบัญชี', 'zh': '注册会计师'},
    {'en': 'Architect', 'th': 'สถาปนิก', 'zh': '建筑师'},
    {'en': 'Interior Designer', 'th': 'นักออกแบบภายใน', 'zh': '室内设计师'},
    {'en': 'Design Civil Engineer', 'th': 'วิศวกรโยธาออกแบบ', 'zh': '设计土木工程师'},
    {'en': 'Construction Civil Engineer', 'th': 'วิศวกรโยธาก่อสร้าง', 'zh': '施工土木工程师'},
    {'en': 'Design Mechanical Engineer', 'th': 'วิศวกรเครื่องกลออกแบบ', 'zh': '设计机械工程师'},
    {'en': 'Construction Mechanical Engineer', 'th': 'วิศวกรเครื่องกลก่อสร้าง', 'zh': '施工机械工程师'},
    {'en': 'Design Electrical Engineer', 'th': 'วิศวกรไฟฟ้าออกแบบ', 'zh': '设计电气工程师'},
    {'en': 'Construction Electrical Engineer', 'th': 'วิศวกรไฟฟ้าก่อสร้าง', 'zh': '施工电气工程师'},
    {'en': 'Software Programmer', 'th': 'โปรแกรมเมอร์', 'zh': '软件程序员'},
    {'en': 'Digital Marketing', 'th': 'การตลาดดิจิทัล', 'zh': '数字营销'},
    {'en': 'Safety Officer', 'th': 'เจ้าหน้าที่ความปลอดภัย', 'zh': '安全官'},
    {'en': 'Others', 'th': 'อื่นๆ', 'zh': '其他'},
  ];

  // Property types
  static const List<Map<String, String>> propertyTypes = [
    {'en': 'Condo', 'th': 'คอนโด', 'zh': '公寓'},
    {'en': 'House & Villa', 'th': 'บ้านและวิลล่า', 'zh': '别墅'},
    {'en': 'Townhouse', 'th': 'ทาวน์เฮ้าส์', 'zh': '联排别墅'},
    {'en': 'Land', 'th': 'ที่ดิน', 'zh': '土地'},
    {'en': 'Commercial', 'th': 'อาคารพาณิชย์', 'zh': '商业'},
    {'en': 'Warehouse & Factory', 'th': 'โกดังและโรงงาน', 'zh': '仓库和工厂'},
  ];

  // Order statuses
  static const Map<String, Map<String, String>> statusLabels = {
    'IN_PROGRESS': {'en': 'In Progress', 'th': 'กำลังดำเนินการ', 'zh': '进行中'},
    'CONFIRMED': {'en': 'Confirmed', 'th': 'ยืนยันแล้ว', 'zh': '已确认'},
    'DEPOSIT_PENDING': {'en': 'Deposit Pending', 'th': 'รอชำระ', 'zh': '待付款'},
    'COMPLETED': {'en': 'Completed', 'th': 'เสร็จสิ้น', 'zh': '已完成'},
    'MATCHING': {'en': 'AI Matching', 'th': 'AI กำลังจับคู่', 'zh': 'AI匹配中'},
    'PENDING': {'en': 'Pending', 'th': 'รอดำเนินการ', 'zh': '待处理'},
    'VIEWING_SCHEDULED': {'en': 'Viewing Scheduled', 'th': 'นัดชม', 'zh': '已预约看房'},
    'CONTACTED': {'en': 'Contacted', 'th': 'ติดต่อแล้ว', 'zh': '已联系'},
    'DEPOSIT_PAID': {'en': 'Deposit Paid', 'th': 'ชำระแล้ว', 'zh': '已付款'},
  };
}
