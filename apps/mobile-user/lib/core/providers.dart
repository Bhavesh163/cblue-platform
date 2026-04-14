import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';

class Translations {
  static const Map<String, Map<String, String>> _strings = {
    // Nav
    'home': {'en': 'Home', 'th': 'หน้าแรก', 'zh': '首页'},
    'services': {'en': 'Services', 'th': 'บริการ', 'zh': '服务'},
    'dashboard': {'en': 'Dashboard', 'th': 'แดชบอร์ด', 'zh': '仪表板'},
    'profile': {'en': 'Profile', 'th': 'โปรไฟล์', 'zh': '个人资料'},
    'chat': {'en': 'Chat', 'th': 'แชท', 'zh': '聊天'},
    'alerts': {'en': 'Alerts', 'th': 'แจ้งเตือน', 'zh': '通知'},
    // Auth
    'login': {'en': 'Login', 'th': 'เข้าสู่ระบบ', 'zh': '登录'},
    'register': {'en': 'Register', 'th': 'ลงทะเบียน', 'zh': '注册'},
    'logout': {'en': 'Logout', 'th': 'ออกจากระบบ', 'zh': '退出登录'},
    'email': {'en': 'Email', 'th': 'อีเมล', 'zh': '电子邮件'},
    'password': {'en': 'Password', 'th': 'รหัสผ่าน', 'zh': '密码'},
    'confirmPassword': {'en': 'Confirm Password', 'th': 'ยืนยันรหัสผ่าน', 'zh': '确认密码'},
    'forgotPassword': {'en': 'Forgot Password?', 'th': 'ลืมรหัสผ่าน?', 'zh': '忘记密码？'},
    'name': {'en': 'Full Name', 'th': 'ชื่อ-นามสกุล', 'zh': '姓名'},
    'phone': {'en': 'Phone', 'th': 'เบอร์โทรศัพท์', 'zh': '电话'},
    'company': {'en': 'Company', 'th': 'บริษัท', 'zh': '公司'},
    'passwordMin8': {'en': 'Password must be at least 8 characters', 'th': 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร', 'zh': '密码至少8个字符'},
    // Dashboard tabs
    'overview': {'en': 'Overview', 'th': 'ภาพรวม', 'zh': '概览'},
    'activeJobs': {'en': 'Active Jobs', 'th': 'งานปัจจุบัน', 'zh': '当前工作'},
    'requests': {'en': 'Requests', 'th': 'คำขอ', 'zh': '请求'},
    'properties': {'en': 'Properties', 'th': 'อสังหาริมทรัพย์', 'zh': '房产'},
    'history': {'en': 'History', 'th': 'ประวัติ', 'zh': '历史'},
    // Booking
    'bookHousehold': {'en': 'Book Household', 'th': 'จองช่างซ่อมบ้าน', 'zh': '预约家庭维修'},
    'bookProject': {'en': 'Book Project', 'th': 'จองโปรเจกต์', 'zh': '预约项目'},
    'bookProfessional': {'en': 'Book Professional', 'th': 'จองมืออาชีพ', 'zh': '预约专业人士'},
    'browseProperties': {'en': 'Browse Properties', 'th': 'ค้นหาอสังหาริมทรัพย์', 'zh': '浏览房产'},
    'serviceInterest': {'en': 'Service of Interest', 'th': 'บริการที่สนใจ', 'zh': '感兴趣的服务'},
    'startDate': {'en': 'Start Date', 'th': 'วันที่ต้องการเริ่มงาน', 'zh': '开始日期'},
    'location': {'en': 'Location', 'th': 'สถานที่', 'zh': '位置'},
    'description': {'en': 'Description', 'th': 'รายละเอียด', 'zh': '描述'},
    'uploadImages': {'en': 'Upload Images', 'th': 'อัพโหลดรูปภาพ', 'zh': '上传图片'},
    'submit': {'en': 'Submit', 'th': 'ส่ง', 'zh': '提交'},
    'confirm': {'en': 'Confirm', 'th': 'ยืนยัน', 'zh': '确认'},
    'cancel': {'en': 'Cancel', 'th': 'ยกเลิก', 'zh': '取消'},
    // Status
    'inProgress': {'en': 'In Progress', 'th': 'กำลังดำเนินการ', 'zh': '进行中'},
    'confirmed': {'en': 'Confirmed', 'th': 'ยืนยันแล้ว', 'zh': '已确认'},
    'completed': {'en': 'Completed', 'th': 'เสร็จสิ้น', 'zh': '已完成'},
    'pending': {'en': 'Pending', 'th': 'รอดำเนินการ', 'zh': '待处理'},
    // Properties
    'forSale': {'en': 'For Sale', 'th': 'ขาย', 'zh': '出售'},
    'forRent': {'en': 'For Rent', 'th': 'ให้เช่า', 'zh': '出租'},
    // FixerResults flow
    'aiMatching': {'en': 'AI Matching', 'th': 'AI กำลังจับคู่', 'zh': 'AI匹配中'},
    'selectPartner': {'en': 'Select Partner', 'th': 'เลือกพาร์ทเนอร์', 'zh': '选择合作伙伴'},
    'purchaseOrder': {'en': 'Purchase Order', 'th': 'ใบสั่งซื้อ', 'zh': '采购订单'},
    'payment': {'en': 'Payment', 'th': 'ชำระเงิน', 'zh': '付款'},
    'meeting': {'en': 'Meeting', 'th': 'นัดพบ', 'zh': '会面'},
    'variation': {'en': 'Variation', 'th': 'งานเพิ่มเติม', 'zh': '变更'},
    'rate': {'en': 'Rate', 'th': 'ให้คะแนน', 'zh': '评分'},
    'done': {'en': 'Done', 'th': 'เสร็จสิ้น', 'zh': '完成'},
    // Misc
    'processingFee': {'en': 'Processing Fee', 'th': 'ค่าดำเนินการ', 'zh': '手续费'},
    'baht': {'en': 'Baht', 'th': 'บาท', 'zh': '泰铢'},
    'noData': {'en': 'No data', 'th': 'ไม่มีข้อมูล', 'zh': '暂无数据'},
    'loading': {'en': 'Loading...', 'th': 'กำลังโหลด...', 'zh': '加载中...'},
    'save': {'en': 'Save', 'th': 'บันทึก', 'zh': '保存'},
    'edit': {'en': 'Edit', 'th': 'แก้ไข', 'zh': '编辑'},
    'delete': {'en': 'Delete', 'th': 'ลบ', 'zh': '删除'},
    'search': {'en': 'Search', 'th': 'ค้นหา', 'zh': '搜索'},
    'pdpaConsent': {'en': 'I agree to PDPA data protection policy', 'th': 'ยินยอม PDPA', 'zh': '同意PDPA数据保护'},
    'pdpaTitle': {'en': 'PDPA Consent', 'th': 'ความยินยอม PDPA', 'zh': 'PDPA同意'},
    'pdpaBody': {
      'en': 'CBLUE collects and uses your personal data to provide services. Data is retained for 3 years (consent), 18 months (history). Inactive accounts are deleted after 12 months.',
      'th': 'CBLUE เก็บและใช้ข้อมูลส่วนบุคคลของท่านเพื่อให้บริการ ข้อมูลเก็บ 3 ปี (ความยินยอม), 18 เดือน (ประวัติ) บัญชีที่ไม่ใช้งานลบหลัง 12 เดือน',
      'zh': 'CBLUE收集并使用您的个人数据提供服务。数据保留3年（同意），18个月（历史）。不活跃帐户12个月后删除。',
    },
    'stars': {'en': 'stars', 'th': 'ดาว', 'zh': '星'},
    'tier': {'en': 'Tier', 'th': 'ระดับ', 'zh': '等级'},
    'promptPayQR': {'en': 'Scan PromptPay QR to pay', 'th': 'สแกน QR PromptPay เพื่อชำระเงิน', 'zh': '扫描PromptPay二维码付款'},
    'chatAnonymous': {'en': 'Chat is anonymous for your safety', 'th': 'แชทไม่เปิดเผยตัวตนเพื่อความปลอดภัย', 'zh': '聊天匿名以保障安全'},
    'rateExperience': {'en': 'Rate your experience', 'th': 'ให้คะแนนประสบการณ์', 'zh': '评价您的体验'},
    'viewSummary': {'en': 'View Summary', 'th': 'ดูสรุป', 'zh': '查看总结'},
    'poNumber': {'en': 'PO Number', 'th': 'เลขที่ PO', 'zh': 'PO编号'},
    'customerPage': {'en': 'Customer Page', 'th': 'หน้าลูกค้า', 'zh': '客户页面'},
    'welcome': {'en': 'Welcome to CBLUE', 'th': 'ยินดีต้อนรับสู่ CBLUE', 'zh': '欢迎来到CBLUE'},
    'bookFixers': {'en': 'Book Fixers & Pros', 'th': 'จองช่างและมืออาชีพ', 'zh': '预约维修和专业人士'},
    'realEstate': {'en': 'Real Estate', 'th': 'อสังหาริมทรัพย์', 'zh': '房地产'},
    'province': {'en': 'Province', 'th': 'จังหวัด', 'zh': '省份'},
    'district': {'en': 'District', 'th': 'เขต/อำเภอ', 'zh': '区'},
    'subdistrict': {'en': 'Sub-district', 'th': 'แขวง/ตำบล', 'zh': '分区'},
    'postalCode': {'en': 'Postal Code', 'th': 'รหัสไปรษณีย์', 'zh': '邮编'},
    'address': {'en': 'Address', 'th': 'ที่อยู่', 'zh': '地址'},
    'houseNumber': {'en': 'House Number', 'th': 'บ้านเลขที่', 'zh': '门牌号'},
    // Properties workflow
    'step': {'en': 'Step', 'th': 'ขั้นตอน', 'zh': '步骤'},
    'select_tier': {'en': 'Select Service Tier', 'th': 'เลือกระดับบริการ', 'zh': '选择服务等级'},
    'processing_fee': {'en': 'Processing Fee', 'th': 'ค่าดำเนินการ', 'zh': '手续费'},
    'for_rent': {'en': 'For Rent', 'th': 'ให้เช่า', 'zh': '出租'},
    'for_sale': {'en': 'For Sale', 'th': 'ขาย', 'zh': '出售'},
    'property_type': {'en': 'Property Type', 'th': 'ประเภทอสังหาฯ', 'zh': '房产类型'},
    'listing_type': {'en': 'Listing Type', 'th': 'ประเภทประกาศ', 'zh': '挂牌类型'},
    'price': {'en': 'Price', 'th': 'ราคา', 'zh': '价格'},
    'full_name': {'en': 'Full Name', 'th': 'ชื่อ-นามสกุล', 'zh': '姓名'},
    'payment_done': {'en': 'Payment Done', 'th': 'ชำระเงินแล้ว', 'zh': '已付款'},
    'fee_disclaimer': {'en': 'Non-refundable processing fee. CBLUE acts as intermediary only.', 'th': 'ค่าดำเนินการไม่สามารถขอคืนได้ CBLUE ทำหน้าที่เป็นตัวกลางเท่านั้น', 'zh': '手续费不可退还。CBLUE仅作为中介'},
    'anonymous_chat': {'en': 'Chat is anonymous for your safety', 'th': 'แชทไม่เปิดเผยตัวตนเพื่อความปลอดภัย', 'zh': '匿名聊天以保障安全'},
    'schedule_meeting': {'en': 'Schedule Meeting', 'th': 'นัดหมาย', 'zh': '安排会面'},
    'confirm_meeting': {'en': 'Confirm Meeting', 'th': 'ยืนยันนัดหมาย', 'zh': '确认会面'},
    'rate_experience': {'en': 'Rate Your Experience', 'th': 'ให้คะแนนประสบการณ์', 'zh': '评价体验'},
    'your_rating': {'en': 'Your Rating', 'th': 'คะแนนของคุณ', 'zh': '您的评分'},
    'lister_rating': {'en': 'Lister Rating', 'th': 'คะแนนจากผู้ลงประกาศ', 'zh': '挂牌方评分'},
    'submit_rating': {'en': 'Submit Rating', 'th': 'ส่งคะแนน', 'zh': '提交评分'},
    'comment': {'en': 'Comment (optional)', 'th': 'ความคิดเห็น (ไม่จำเป็น)', 'zh': '评论（可选）'},
    'view_summary': {'en': 'View Summary', 'th': 'ดูสรุป', 'zh': '查看总结'},
    'workflow_complete': {'en': 'Workflow Complete!', 'th': 'สำเร็จ!', 'zh': '流程完成！'},
    'back_to_home': {'en': 'Back to Home', 'th': 'กลับหน้าแรก', 'zh': '返回首页'},
    'contact_lister': {'en': 'Contact Lister', 'th': 'ติดต่อผู้ลงประกาศ', 'zh': '联系卖家'},
    // Error & validation messages
    'invalid_credentials': {'en': 'Invalid email or password', 'th': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'zh': '电子邮件或密码无效'},
    'connection_error': {'en': 'Connection error. Please try again.', 'th': 'เชื่อมต่อผิดพลาด กรุณาลองใหม่', 'zh': '连接错误，请重试'},
    'pdpa_required': {'en': 'Please accept PDPA consent', 'th': 'กรุณายอมรับ PDPA', 'zh': '请接受PDPA同意'},
    'email_exists': {'en': 'Email already registered', 'th': 'อีเมลนี้ลงทะเบียนแล้ว', 'zh': '该邮箱已注册'},
    'registration_error': {'en': 'Registration failed. Please try again.', 'th': 'ลงทะเบียนล้มเหลว กรุณาลองใหม่', 'zh': '注册失败，请重试'},
    'required_field': {'en': 'Required', 'th': 'จำเป็น', 'zh': '必填'},
    'invalid_email': {'en': 'Invalid email', 'th': 'อีเมลไม่ถูกต้อง', 'zh': '邮箱格式无效'},
    'passwords_mismatch': {'en': 'Passwords do not match', 'th': 'รหัสผ่านไม่ตรงกัน', 'zh': '密码不匹配'},
    'ok': {'en': 'OK', 'th': 'ตกลง', 'zh': '好的'},
    'status_label': {'en': 'Status', 'th': 'สถานะ', 'zh': '状态'},
    'date_label': {'en': 'Date', 'th': 'วันที่', 'zh': '日期'},
    'avg_rating': {'en': 'Avg Rating', 'th': 'คะแนนเฉลี่ย', 'zh': '平均评分'},
    'recent_activity': {'en': 'Recent Activity', 'th': 'กิจกรรมล่าสุด', 'zh': '最近活动'},
  };

  static String get(String key, String locale) {
    return _strings[key]?[locale] ?? _strings[key]?['en'] ?? key;
  }
}

class LocaleProvider extends ChangeNotifier {
  String _locale = 'en';
  String get locale => _locale;

  static const _storage = FlutterSecureStorage();

  Future<void> init() async {
    final saved = await _storage.read(key: 'locale');
    if (saved != null) _locale = saved;
    notifyListeners();
  }

  Future<void> setLocale(String locale) async {
    _locale = locale;
    await _storage.write(key: 'locale', value: locale);
    notifyListeners();
  }

  String t(String key) => Translations.get(key, _locale);
}

class AuthProvider extends ChangeNotifier {
  static const _storage = FlutterSecureStorage();
  Map<String, dynamic>? _subscriber;
  String? _token;
  bool _pdpaConsent = false;

  Map<String, dynamic>? get subscriber => _subscriber;
  String? get token => _token;
  bool get isLoggedIn => _subscriber != null && _token != null;
  bool get pdpaConsent => _pdpaConsent;
  String get displayName => _subscriber?['name'] ?? '';
  String get email => _subscriber?['email'] ?? '';

  Future<void> init() async {
    final subJson = await _storage.read(key: 'subscriber');
    final tok = await _storage.read(key: 'subscriber_token');
    final pdpa = await _storage.read(key: 'pdpa_consent_customer');
    if (subJson != null) _subscriber = json.decode(subJson);
    _token = tok;
    _pdpaConsent = pdpa != null;
    notifyListeners();
  }

  Future<void> login(Map<String, dynamic> subscriber, String token) async {
    _subscriber = subscriber;
    _token = token;
    await _storage.write(key: 'subscriber', value: json.encode(subscriber));
    await _storage.write(key: 'subscriber_token', value: token);
    // Restore PDPA consent from storage if previously accepted
    final pdpa = await _storage.read(key: 'pdpa_consent_customer');
    _pdpaConsent = pdpa != null;
    notifyListeners();
  }

  Future<void> logout() async {
    _subscriber = null;
    _token = null;
    _pdpaConsent = false;
    await _storage.delete(key: 'subscriber');
    await _storage.delete(key: 'subscriber_token');
    await _storage.delete(key: 'pdpa_consent_customer');
    notifyListeners();
  }

  Future<void> acceptPdpa() async {
    _pdpaConsent = true;
    await _storage.write(
      key: 'pdpa_consent_customer',
      value: DateTime.now().toIso8601String(),
    );
    notifyListeners();
  }
}
