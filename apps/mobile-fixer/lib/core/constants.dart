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
  static const List<String> householdServices = [
    'Plumbing', 'Electrical', 'Air Conditioning', 'Painting',
    'Cleaning', 'General Maintenance',
  ];

  // Project services
  static const List<String> projectServices = [
    'Architect', 'Interior Designer', 'Structural Engineer',
    'Landscape Designer', 'MEP Engineer', 'Quantity Surveyor',
    'Project Manager', 'Contractor (Renovation)', 'Contractor (New Build)',
    'Contractor (Fit-out)', 'Roofing Specialist', 'Waterproofing',
    'Foundation Specialist', 'Steel Fabricator', 'Glass & Aluminium',
    'HVAC Specialist', 'Fire Protection', 'Security Systems',
    'Smart Home', 'Solar Installation',
  ];

  // Professional services
  static const List<String> professionalServices = [
    'Real Estate Agent', 'Property Valuator', 'Mortgage Broker',
    'Legal Advisor', 'Tax Consultant', 'Insurance Agent',
    'Home Inspector', 'Feng Shui Consultant', 'Moving Service',
    'Pest Control', 'Garden Maintenance', 'Pool Maintenance',
    'Security Guard', 'Property Manager', 'Facility Manager',
  ];

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
