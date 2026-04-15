import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';

class Translations {
  static const Map<String, Map<String, String>> _strings = {
    // App
    'app_title': {'en': 'CBLUE Customer', 'th': 'CBLUE ลูกค้า', 'zh': 'CBLUE 客户'},
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
    'auto_detect_gps': {'en': 'Auto-detect Location (GPS)', 'th': 'ตรวจจับตำแหน่ง (GPS)', 'zh': '自动检测位置 (GPS)'},
    'detecting': {'en': 'Detecting...', 'th': 'กำลังตรวจจับ...', 'zh': '检测中...'},
    'gps_denied': {'en': 'Location access denied. Please enable in settings.', 'th': 'ไม่ได้รับอนุญาตเข้าถึงตำแหน่ง กรุณาเปิดใน Settings', 'zh': '位置访问被拒绝，请在设置中启用'},
    'gps_error': {'en': 'Could not detect location', 'th': 'ไม่สามารถตรวจจับตำแหน่งได้', 'zh': '无法检测位置'},
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
    // Properties workflow
    'notifying_lister': {'en': 'Notifying property lister...', 'th': 'กำลังแจ้งผู้ลงประกาศ...', 'zh': '正在通知房产发布者...'},
    'waiting_confirmation': {'en': 'Waiting for confirmation', 'th': 'รอการยืนยัน', 'zh': '等待确认'},
    'lister_confirmed': {'en': 'Lister Confirmed!', 'th': 'ผู้ลงประกาศยืนยันแล้ว!', 'zh': '发布者已确认！'},
    'non_refundable_fee': {'en': 'Non-refundable processing fee', 'th': 'ค่าดำเนินการไม่สามารถขอคืนได้', 'zh': '手续费不可退还'},
    'property_label': {'en': 'Property', 'th': 'ทรัพย์สิน', 'zh': '房产'},
    'message_hint': {'en': 'Message...', 'th': 'ข้อความ...', 'zh': '消息...'},
    // Fixer results
    'selection_criteria': {'en': 'Selection Criteria:', 'th': 'เกณฑ์การคัดเลือก:', 'zh': '选择标准:'},
    'criteria_legend': {'en': '💰 2 cheapest  ⭐ 2 highest rated  🏆 Upper tier  🔄 Returning  👤 Your nomination', 'th': '💰 2 ถูกที่สุด  ⭐ 2 คะแนนสูงสุด  🏆 ระดับบน  🔄 เคยใช้  👤 เสนอเอง', 'zh': '💰 2最便宜  ⭐ 2最高评分  🏆 高级  🔄 回头客  👤 您的提名'},
    'jobs_count': {'en': 'jobs', 'th': 'งาน', 'zh': '个工作'},
    'your_nomination': {'en': '👤 Your Nomination', 'th': '👤 คุณเสนอ', 'zh': '👤 您的提名'},
    'partner_label': {'en': 'Partner', 'th': 'พาร์ทเนอร์', 'zh': '合作伙伴'},
    'your_rating_label': {'en': 'Your Rating', 'th': 'คะแนนของคุณ', 'zh': '您的评分'},
    'partner_rating_label': {'en': 'Partner Rating', 'th': 'คะแนนพาร์ทเนอร์', 'zh': '合作伙伴评分'},
    'file_sharing_soon': {'en': 'File sharing coming soon', 'th': 'แชร์ไฟล์เร็วๆ นี้', 'zh': '文件分享即将推出'},
    'no_account': {'en': "Don't have an account?", 'th': 'ยังไม่มีบัญชี?', 'zh': '没有帐户？'},
    'household_tab': {'en': 'Household', 'th': 'บ้าน', 'zh': '家庭'},
    'project_tab': {'en': 'Project', 'th': 'โปรเจกต์', 'zh': '项目'},
    'professional_tab': {'en': 'Professional', 'th': 'มืออาชีพ', 'zh': '专业'},
    'confirm_delete_msg': {'en': 'Are you sure you want to delete this?', 'th': 'คุณแน่ใจหรือไม่ว่าต้องการลบ?', 'zh': '您确定要删除吗？'},
    'variation_approved': {'en': 'Approved', 'th': 'อนุมัติแล้ว', 'zh': '已批准'},
    'variation_declined': {'en': 'Declined', 'th': 'ปฏิเสธ', 'zh': '已拒绝'},
    // Greeting & overview
    'hello': {'en': 'Hello', 'th': 'สวัสดี', 'zh': '你好'},
    'welcome_platform': {'en': 'Welcome to CBLUE Platform', 'th': 'ยินดีต้อนรับสู่ CBLUE แพลตฟอร์ม', 'zh': '欢迎来到CBLUE平台'},
    'household_desc': {'en': 'Plumbing, Electrical, AC, Interior', 'th': 'ประปา, ไฟฟ้า, แอร์, ตกแต่ง', 'zh': '水管, 电气, 空调, 装修'},
    'project_desc': {'en': 'Web, App, AI, Solar, EV', 'th': 'เว็บ, แอป, AI, โซลาร์, EV', 'zh': '网站, 应用, AI, 太阳能, EV'},
    'professional_desc': {'en': 'Lawyer, Architect, Engineer, CPA', 'th': 'ทนายความ, สถาปนิก, วิศวกร, CPA', 'zh': '律师, 建筑师, 工程师, CPA'},
    'property_desc': {'en': 'Condo, House, Land, Commercial', 'th': 'คอนโด, บ้าน, ที่ดิน, อาคาร', 'zh': '公寓, 别墅, 土地, 商业'},
    // Profile stats & settings
    'total_jobs': {'en': 'Total Jobs', 'th': 'งานทั้งหมด', 'zh': '总工作'},
    'member_since': {'en': 'Member Since', 'th': 'สมาชิกตั้งแต่', 'zh': '会员自'},
    'settings': {'en': 'Settings', 'th': 'ตั้งค่า', 'zh': '设置'},
    'edit_profile': {'en': 'Edit Profile', 'th': 'แก้ไขโปรไฟล์', 'zh': '编辑个人资料'},
    'change_password': {'en': 'Change Password', 'th': 'เปลี่ยนรหัสผ่าน', 'zh': '更改密码'},
    'notifications': {'en': 'Notifications', 'th': 'การแจ้งเตือน', 'zh': '通知设置'},
    'new_password': {'en': 'New Password', 'th': 'รหัสผ่านใหม่', 'zh': '新密码'},
    'profile_updated': {'en': 'Profile updated ✓', 'th': 'อัปเดตโปรไฟล์แล้ว ✓', 'zh': '个人资料已更新 ✓'},
    'password_changed': {'en': 'Password changed ✓', 'th': 'เปลี่ยนรหัสผ่านแล้ว ✓', 'zh': '密码已更改 ✓'},
    'notifications_enabled': {'en': 'Notifications enabled ✓', 'th': 'การแจ้งเตือนเปิดอยู่ ✓', 'zh': '通知已开启 ✓'},
    'pdpa_data_retained': {'en': 'Data retained per PDPA: consent 3 years, history 18 months, inactive accounts 12 months', 'th': 'ข้อมูลเก็บรักษาตาม PDPA: ความยินยอม 3 ปี, ประวัติ 18 เดือน, บัญชีไม่ใช้งาน 12 เดือน', 'zh': '数据按PDPA保留：同意3年，历史18个月，不活跃帐户12个月'},
    'pdpa_consented': {'en': 'Consented ✓', 'th': 'ยินยอมแล้ว ✓', 'zh': '已同意 ✓'},
    'logout_confirm': {'en': 'Are you sure you want to logout?', 'th': 'คุณต้องการออกจากระบบหรือไม่?', 'zh': '确定要退出登录吗？'},
    // Matching
    'ai_matching_title': {'en': 'AI Matching Results', 'th': 'ผลการจับคู่ AI', 'zh': 'AI匹配结果'},
    'finding_best': {'en': 'Finding the best fixers and professionals for you...', 'th': 'กำลังค้นหาช่างและมืออาชีพที่ดีที่สุดสำหรับคุณ...', 'zh': '正在为您寻找最佳的维修师和专业人士...'},
    // Partner profile
    'profile_updated_msg': {'en': 'Profile updated ✓', 'th': 'อัปเดตโปรไฟล์แล้ว ✓', 'zh': '个人资料已更新 ✓'},
    'auto_reply': {'en': 'Thank you, I will review and get back to you shortly.', 'th': 'ขอบคุณครับ จะตรวจสอบและติดต่อกลับโดยเร็ว', 'zh': '谢谢，我会审核并尽快回复您。'},
    // Activity items
    'ac_repair_in_progress': {'en': 'AC Repair - In Progress', 'th': 'ซ่อมแอร์ - กำลังดำเนินการ', 'zh': '空调维修 - 进行中'},
    'condo_viewing': {'en': 'Sukhumvit Condo - Viewing', 'th': 'คอนโดสุขุมวิท - นัดชม', 'zh': '素坤逸公寓 - 已预约'},
    'plumbing_completed': {'en': 'Plumbing Fix - Completed', 'th': 'ซ่อมท่อน้ำ - เสร็จสิ้น', 'zh': '水管维修 - 已完成'},
    'time_2h': {'en': '2 hours ago', 'th': '2 ชั่วโมงที่ผ่านมา', 'zh': '2小时前'},
    'time_1d': {'en': '1 day ago', 'th': '1 วันที่ผ่านมา', 'zh': '1天前'},
    'time_3d': {'en': '3 days ago', 'th': '3 วันที่ผ่านมา', 'zh': '3天前'},
    // Filters & UI
    'advanced_filters_soon': {'en': 'Advanced filters coming soon', 'th': 'ตัวกรองขั้นสูง เร็วๆ นี้', 'zh': '高级筛选即将推出'},
    'view_details': {'en': 'View Details', 'th': 'ดูรายละเอียด', 'zh': '查看详情'},
    'chat_greeting': {'en': 'Hello, I want to ask about the job', 'th': 'สวัสดีครับ ขอสอบถามเรื่องงาน', 'zh': '你好，想咨询工作事宜'},
    // Fixer results
    'nominate_hint': {'en': '👤 Nominate partner ID', 'th': '👤 เสนอ ID พาร์ทเนอร์', 'zh': '👤 提名合作伙伴ID'},
    'add': {'en': 'Add', 'th': 'เพิ่ม', 'zh': '添加'},
    'confirm_selection': {'en': 'Confirm Selection', 'th': 'ยืนยันการเลือก', 'zh': '确认选择'},
    'fee_non_refundable': {'en': '⚠️ Processing fee is non-refundable', 'th': '⚠️ ค่าดำเนินการไม่สามารถคืนเงินได้', 'zh': '⚠️ 手续费不可退还'},
    // Forgot password
    'reset_link_sent': {'en': 'Password reset link sent to your email', 'th': 'ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลแล้ว', 'zh': '重置密码链接已发送到您的邮箱'},
    'back_to_login': {'en': 'Back to Login', 'th': 'กลับไปเข้าสู่ระบบ', 'zh': '返回登录'},
    'send_reset_link': {'en': 'Send Reset Link', 'th': 'ส่งลิงก์รีเซ็ต', 'zh': '发送重置链接'},
    'pdpa_submit_notice': {'en': 'By submitting you agree to PDPA data protection. Data retained 3 years.', 'th': 'การส่งแบบฟอร์มนี้ถือว่าท่านยินยอม PDPA ข้อมูลเก็บ 3 ปี', 'zh': '提交此表格即表示您同意PDPA，数据保留3年'},
    // PO & flow
    'customer_label': {'en': 'Customer', 'th': 'ลูกค้า', 'zh': '客户'},
    'service_label': {'en': 'Service', 'th': 'บริการ', 'zh': '服务'},
    'est_price': {'en': 'Est. Price', 'th': 'ราคาประมาณ', 'zh': '预估价格'},
    'proceed': {'en': 'Proceed', 'th': 'ดำเนินการต่อ', 'zh': '继续'},
    'waiting_partner': {'en': 'Waiting for partner confirmation...', 'th': 'กำลังรอพาร์ทเนอร์ยืนยัน...', 'zh': '等待合作伙伴确认...'},
    'partner_confirmed': {'en': 'Partner Confirmed!', 'th': 'พาร์ทเนอร์ยืนยันแล้ว!', 'zh': '合作伙伴已确认！'},
    'proceed_payment': {'en': 'Proceed to Payment', 'th': 'ชำระเงิน', 'zh': '去付款'},
    'service_details': {'en': 'Service Details', 'th': 'รายละเอียดบริการ', 'zh': '服务详情'},
    'start_chat_with': {'en': 'Start chatting with Partner', 'th': 'เริ่มแชทกับพาร์ทเนอร์', 'zh': '开始与合作伙伴聊天'},
    'schedule_meeting_btn': {'en': 'Schedule Meeting', 'th': 'นัดพบ', 'zh': '预约会面'},
    'fee_separate': {'en': '⚠️ Processing fee is separate from work payment', 'th': '⚠️ ค่าดำเนินการไม่รวมอยู่ในค่างานจริง', 'zh': '⚠️ 手续费不包含在实际工作费中'},
    'confirm_meeting_btn': {'en': 'Confirm Meeting', 'th': 'ยืนยันการนัดพบ', 'zh': '确认会面'},
    'variation_title': {'en': '📋 Variation / Addendum', 'th': '📋 งานเพิ่มเติม (Addendum)', 'zh': '📋 附加工作'},
    'variation_desc': {'en': 'Partner has proposed additional work. Please review and approve.', 'th': 'พาร์ทเนอร์เสนองานเพิ่มเติม กรุณาตรวจสอบและอนุมัติ', 'zh': '合作伙伴提出了额外工作，请审核并批准'},
    'approve': {'en': 'Approve', 'th': 'อนุมัติ', 'zh': '批准'},
    'decline_btn': {'en': 'Decline', 'th': 'ปฏิเสธ', 'zh': '拒绝'},
    'job_complete': {'en': 'Job Complete!', 'th': 'งานเสร็จสิ้น!', 'zh': '工作完成！'},
    'your_rating_colon': {'en': 'Your Rating:', 'th': 'คะแนนของคุณ:', 'zh': '您的评分:'},
    'comment_hint': {'en': 'Comment...', 'th': 'ความคิดเห็น...', 'zh': '评论...'},
    'partner_rating_colon': {'en': 'Partner Rating:', 'th': 'คะแนนจากพาร์ทเนอร์:', 'zh': '合作伙伴评分:'},
    // Steps (FixerResults flow)
    'matching': {'en': 'Matching', 'th': 'กำลังจับคู่', 'zh': '匹配中'},
    'list': {'en': 'Select Partner', 'th': 'เลือกพาร์ทเนอร์', 'zh': '选择合作伙伴'},
    'po': {'en': 'Purchase Order', 'th': 'ใบสั่งซื้อ', 'zh': '采购订单'},
    'notify': {'en': 'Notify', 'th': 'แจ้งเตือน', 'zh': '通知'},
    'complete': {'en': 'Complete', 'th': 'เสร็จสิ้น', 'zh': '完成'},
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
