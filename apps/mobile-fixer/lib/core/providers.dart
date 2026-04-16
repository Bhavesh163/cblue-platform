import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------
class Translations {
  static const Map<String, Map<String, String>> _t = {
    'app_title': {'en': 'Cblue Partner', 'th': 'Cblue พาร์ทเนอร์', 'zh': 'Cblue 合作伙伴'},
    'dashboard': {'en': 'Our Partner', 'th': 'พาร์ทเนอร์ของเรา', 'zh': '我们的合作伙伴'},
    'overview': {'en': 'Overview', 'th': 'ภาพรวม', 'zh': '概览'},
    'active_jobs': {'en': 'Active Jobs', 'th': 'งานปัจจุบัน', 'zh': '活跃工作'},
    'incoming': {'en': 'Incoming', 'th': 'งานเข้า', 'zh': '待接收'},
    'properties': {'en': 'Properties', 'th': 'อสังหาริมทรัพย์', 'zh': '房产'},
    'history': {'en': 'History', 'th': 'ประวัติ', 'zh': '历史'},
    'chat': {'en': 'Chat', 'th': 'แชท', 'zh': '聊天'},
    'alerts': {'en': 'Alerts', 'th': 'การแจ้งเตือน', 'zh': '通知'},
    'profile': {'en': 'Profile', 'th': 'โปรไฟล์', 'zh': '个人资料'},
    'jobs': {'en': 'Jobs', 'th': 'งาน', 'zh': '工作'},
    'my_properties': {'en': 'My Properties', 'th': 'ทรัพย์สินของฉัน', 'zh': '我的房产'},
    'login': {'en': 'Login', 'th': 'เข้าสู่ระบบ', 'zh': '登录'},
    'register': {'en': 'Register', 'th': 'สมัครสมาชิก', 'zh': '注册'},
    'email': {'en': 'Email', 'th': 'อีเมล', 'zh': '电子邮箱'},
    'password': {'en': 'Password', 'th': 'รหัสผ่าน', 'zh': '密码'},
    'confirm_password': {'en': 'Confirm Password', 'th': 'ยืนยันรหัสผ่าน', 'zh': '确认密码'},
    'forgot_password': {'en': 'Forgot Password?', 'th': 'ลืมรหัสผ่าน?', 'zh': '忘记密码?'},
    'full_name': {'en': 'Full Name', 'th': 'ชื่อเต็ม', 'zh': '全名'},
    'phone': {'en': 'Phone', 'th': 'โทรศัพท์', 'zh': '电话'},
    'company': {'en': 'Company', 'th': 'บริษัท', 'zh': '公司'},
    'auto_detect_gps': {'en': 'Auto-detect Location (GPS)', 'th': 'ตรวจจับตำแหน่ง (GPS)', 'zh': '自动检测位置 (GPS)'},
    'detecting': {'en': 'Detecting...', 'th': 'กำลังตรวจจับ...', 'zh': '检测中...'},
    'gps_denied': {'en': 'Location access denied', 'th': 'ไม่ได้รับอนุญาตเข้าถึงตำแหน่ง', 'zh': '位置访问被拒绝'},
    'gps_error': {'en': 'Could not detect location', 'th': 'ไม่สามารถตรวจจับตำแหน่งได้', 'zh': '无法检测位置'},
    'logout': {'en': 'Logout', 'th': 'ออกจากระบบ', 'zh': '退出'},
    'logout_confirm': {'en': 'Are you sure you want to logout?', 'th': 'คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ?', 'zh': '您确定要退出吗?'},
    'cancel': {'en': 'Cancel', 'th': 'ยกเลิก', 'zh': '取消'},
    'confirm': {'en': 'Confirm', 'th': 'ยืนยัน', 'zh': '确认'},
    'submit': {'en': 'Submit', 'th': 'ส่ง', 'zh': '提交'},
    'save': {'en': 'Save', 'th': 'บันทึก', 'zh': '保存'},
    'delete': {'en': 'Delete', 'th': 'ลบ', 'zh': '删除'},
    'edit': {'en': 'Edit', 'th': 'แก้ไข', 'zh': '编辑'},
    'welcome_back': {'en': 'Welcome back', 'th': 'ยินดีต้อนรับกลับ', 'zh': '欢迎回来'},
    'total_earnings': {'en': 'Total Earnings', 'th': 'รายได้ทั้งหมด', 'zh': '总收入'},
    'completed_jobs': {'en': 'Completed Jobs', 'th': 'งานเสร็จสิ้น', 'zh': '已完成工作'},
    'rating': {'en': 'Rating', 'th': 'คะแนน', 'zh': '评分'},
    'tier': {'en': 'Tier', 'th': 'ระดับ', 'zh': '等级'},
    'accept': {'en': 'Accept', 'th': 'รับงาน', 'zh': '接受'},
    'decline': {'en': 'Decline', 'th': 'ปฏิเสธ', 'zh': '拒绝'},
    'complete_job': {'en': 'Complete Job', 'th': 'เสร็จสิ้นงาน', 'zh': '完成工作'},
    'view_details': {'en': 'View Details', 'th': 'ดูรายละเอียด', 'zh': '查看详情'},
    'no_jobs': {'en': 'No jobs yet', 'th': 'ยังไม่มีงาน', 'zh': '暂无工作'},
    'urgency_high': {'en': 'HIGH', 'th': 'เร่งด่วน', 'zh': '紧急'},
    'urgency_medium': {'en': 'MEDIUM', 'th': 'ปานกลาง', 'zh': '中等'},
    'urgency_low': {'en': 'LOW', 'th': 'ต่ำ', 'zh': '低'},
    'processing_fee': {'en': 'Processing Fee', 'th': 'ค่าธรรมเนียม', 'zh': '处理费'},
    'add_property': {'en': 'Add Property', 'th': 'เพิ่มทรัพย์สิน', 'zh': '添加房产'},
    'property_type': {'en': 'Property Type', 'th': 'ประเภทอสังหาฯ', 'zh': '房产类型'},
    'listing_type': {'en': 'Listing Type', 'th': 'ประเภทรายการ', 'zh': '房源类型'},
    'price': {'en': 'Price', 'th': 'ราคา', 'zh': '价格'},
    'area_sqm': {'en': 'Area (sqm)', 'th': 'พื้นที่ (ตร.ม.)', 'zh': '面积 (平方米)'},
    'bedrooms': {'en': 'Bedrooms', 'th': 'ห้องนอน', 'zh': '卧室'},
    'bathrooms': {'en': 'Bathrooms', 'th': 'ห้องน้ำ', 'zh': '浴室'},
    'location': {'en': 'Location', 'th': 'ที่ตั้ง', 'zh': '位置'},
    'postal_code': {'en': 'Postal Code', 'th': 'รหัสไปรษณีย์', 'zh': '邮政编码'},
    'description': {'en': 'Description', 'th': 'รายละเอียด', 'zh': '描述'},
    'upload_images': {'en': 'Upload Images', 'th': 'อัปโหลดรูปภาพ', 'zh': '上传图片'},
    'for_sale': {'en': 'FOR SALE', 'th': 'ขาย', 'zh': '出售'},
    'for_rent': {'en': 'FOR RENT', 'th': 'ให้เช่า', 'zh': '出租'},
    'per_month': {'en': '/month', 'th': '/เดือน', 'zh': '/月'},
    'activate': {'en': 'Activate', 'th': 'เปิดใช้งาน', 'zh': '激活'},
    'deactivate': {'en': 'Deactivate', 'th': 'ปิดใช้งาน', 'zh': '停用'},
    'active': {'en': 'Active', 'th': 'ใช้งาน', 'zh': '活跃'},
    'inactive': {'en': 'Inactive', 'th': 'ไม่ใช้งาน', 'zh': '未活跃'},
    'skills': {'en': 'Skills', 'th': 'ทักษะ', 'zh': '技能'},
    'kyc_verification': {'en': 'KYC Verification', 'th': 'ยืนยันตัวตน KYC', 'zh': 'KYC 身份验证'},
    'take_selfie': {'en': 'Take Selfie', 'th': 'ถ่ายเซลฟี่', 'zh': '自拍'},
    'upload_id': {'en': 'Upload ID Card', 'th': 'อัปโหลดบัตรประชาชน', 'zh': '上传身份证'},
    'portfolio': {'en': 'Portfolio', 'th': 'ผลงาน', 'zh': '作品集'},
    'upload_portfolio': {'en': 'Upload Portfolio', 'th': 'อัปโหลดผลงาน', 'zh': '上传作品集'},
    'pdpa_consent': {'en': 'I agree to the PDPA data consent policy', 'th': 'ฉันยินยอมตามนโยบาย PDPA', 'zh': '我同意 PDPA 数据同意政策'},
    'pdpa_notice': {'en': 'Your data is retained for 3 years (consent), 18 months (history). Inactive accounts deleted after 12 months per PDPA.', 'th': 'ข้อมูลเก็บรักษาตาม PDPA: ความยินยอม 3 ปี, ประวัติ 18 เดือน, บัญชีไม่ใช้งาน 12 เดือน', 'zh': '数据按PDPA保留：同意3年，历史18个月，不活跃帐户12个月。'},
    'anonymous_chat_notice': {'en': 'Chat is anonymous until payment is confirmed for your safety.', 'th': 'แชทเป็นนิรนามจนกว่าจะยืนยันการชำระเงินเพื่อความปลอดภัยของคุณ', 'zh': '为了您的安全，聊天在确认付款前是匿名的。'},
    'send_reset_link': {'en': 'Send Reset Link', 'th': 'ส่งลิงก์รีเซ็ต', 'zh': '发送重置链接'},
    'reset_sent': {'en': 'Reset link sent to your email', 'th': 'ส่งลิงก์รีเซ็ตไปยังอีเมลของคุณแล้ว', 'zh': '重置链接已发送到您的邮箱'},
    'no_account': {'en': "Don't have an account?", 'th': 'ยังไม่มีบัญชี?', 'zh': '没有账号?'},
    'have_account': {'en': 'Already have an account?', 'th': 'มีบัญชีอยู่แล้ว?', 'zh': '已有账号?'},
    'register_as_partner': {'en': 'Register as Partner', 'th': 'สมัครเป็นพาร์ทเนอร์', 'zh': '注册为合作伙伴'},
    'service_category': {'en': 'Service Category', 'th': 'หมวดหมู่บริการ', 'zh': '服务类别'},
    'household': {'en': 'Household', 'th': 'งานบ้าน', 'zh': '家庭服务'},
    'project': {'en': 'Project', 'th': 'โปรเจค', 'zh': '项目'},
    'professional': {'en': 'Professional', 'th': 'มืออาชีพ', 'zh': '专业'},
    'property_lister': {'en': 'Property Lister', 'th': 'ผู้ลงประกาศอสังหาฯ', 'zh': '房产刊登者'},
    'select_services': {'en': 'Select Services', 'th': 'เลือกบริการ', 'zh': '选择服务'},
    'ai_evaluation': {'en': 'AI Evaluation', 'th': 'การประเมินด้วย AI', 'zh': 'AI 评估'},
    'pending_review': {'en': 'Pending Review', 'th': 'รอตรวจสอบ', 'zh': '待审核'},
    'approved': {'en': 'Approved', 'th': 'อนุมัติแล้ว', 'zh': '已批准'},
    'rejected': {'en': 'Rejected', 'th': 'ถูกปฏิเสธ', 'zh': '已拒绝'},
    'go_to_dashboard': {'en': 'Go to Dashboard', 'th': 'ไปที่แดชบอร์ด', 'zh': '前往仪表板'},
    'edit_profile': {'en': 'Edit Profile', 'th': 'แก้ไขโปรไฟล์', 'zh': '编辑个人资料'},
    'change_password': {'en': 'Change Password', 'th': 'เปลี่ยนรหัสผ่าน', 'zh': '更改密码'},
    'rate_customer': {'en': 'Rate Customer', 'th': 'ให้คะแนนลูกค้า', 'zh': '评价客户'},
    'submit_rating': {'en': 'Submit Rating', 'th': 'ส่งคะแนน', 'zh': '提交评分'},
    'rating_submitted': {'en': 'Rating submitted', 'th': 'ส่งคะแนนแล้ว', 'zh': '评分已提交'},
    'job_completed': {'en': 'Job completed', 'th': 'งานเสร็จสิ้น', 'zh': '工作已完成'},
    'job_accepted': {'en': 'Job accepted', 'th': 'รับงานแล้ว', 'zh': '工作已接受'},
    'job_declined': {'en': 'Job declined', 'th': 'ปฏิเสธงานแล้ว', 'zh': '工作已拒绝'},
    'kyc_upload_failed': {'en': 'KYC upload failed. You can update later from Profile.', 'th': 'อัปโหลด KYC ล้มเหลว สามารถอัปเดตได้ภายหลังจากโปรไฟล์', 'zh': 'KYC上传失败，您可以稍后在个人资料中更新。'},
    'portfolio_upload_failed': {'en': 'Portfolio upload failed. You can update later from Profile.', 'th': 'อัปโหลดผลงานล้มเหลว สามารถอัปเดตได้ภายหลังจากโปรไฟล์', 'zh': '作品上传失败，您可以稍后在个人资料中更新。'},
    'current_password': {'en': 'Current Password', 'th': 'รหัสผ่านปัจจุบัน', 'zh': '当前密码'},
    'new_password': {'en': 'New Password', 'th': 'รหัสผ่านใหม่', 'zh': '新密码'},
    'file_sharing_soon': {'en': 'File sharing coming soon', 'th': 'แชร์ไฟล์เร็วๆ นี้', 'zh': '文件分享即将推出'},
    'new_job_request': {'en': 'New job request', 'th': 'งานใหม่เข้ามา', 'zh': '新工作请求'},
    'payment_received': {'en': 'Payment received', 'th': 'ได้รับการชำระเงิน', 'zh': '已收到付款'},
    'job_reminder': {'en': 'Job reminder', 'th': 'แจ้งเตือนงาน', 'zh': '工作提醒'},
    'review_received': {'en': 'Review received', 'th': 'ได้รับรีวิว', 'zh': '收到评价'},
    'system_update': {'en': 'System update', 'th': 'อัปเดตระบบ', 'zh': '系统更新'},
    'promotion': {'en': 'Promotion', 'th': 'โปรโมชั่น', 'zh': '促销活动'},
    'earnings': {'en': 'Earnings', 'th': 'รายได้', 'zh': '收入'},
    'incoming_requests': {'en': 'Incoming Requests', 'th': 'คำขอที่เข้ามา', 'zh': '收到的请求'},
    'recent_activity': {'en': 'Recent Activity', 'th': 'กิจกรรมล่าสุด', 'zh': '最近活动'},
    'progress': {'en': 'Progress', 'th': 'ความคืบหน้า', 'zh': '进度'},
    'budget': {'en': 'Budget', 'th': 'งบประมาณ', 'zh': '预算'},
    'urgency': {'en': 'Urgency', 'th': 'ความเร่งด่วน', 'zh': '紧急程度'},
    'earned': {'en': 'Earned', 'th': 'รายได้', 'zh': '收入'},
    'fee': {'en': 'Fee', 'th': 'ค่าธรรมเนียม', 'zh': '手续费'},
    'evaluation_complete': {'en': 'Evaluation complete', 'th': 'การประเมินเสร็จสิ้น', 'zh': '评估完成'},
    'analyzing_profile': {'en': 'Analyzing your profile...', 'th': 'กำลังวิเคราะห์โปรไฟล์ของคุณ...', 'zh': '正在分析您的资料...'},
    'assigned_tier': {'en': 'Assigned Tier', 'th': 'ระดับที่ได้รับ', 'zh': '分配等级'},
    'ai_score': {'en': 'AI Score', 'th': 'คะแนน AI', 'zh': 'AI 分数'},
    'no_properties': {'en': 'No properties', 'th': 'ยังไม่มีทรัพย์สิน', 'zh': '暂无房产'},
    // Error & validation messages
    'invalid_credentials': {'en': 'Invalid email or password', 'th': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'zh': '电子邮件或密码无效'},
    'connection_error': {'en': 'Connection error. Please try again.', 'th': 'เชื่อมต่อผิดพลาด กรุณาลองใหม่', 'zh': '连接错误，请重试'},
    'registration_error': {'en': 'Registration failed. Please try again.', 'th': 'ลงทะเบียนล้มเหลว กรุณาลองใหม่', 'zh': '注册失败，请重试'},
    'required_field': {'en': 'Required', 'th': 'จำเป็น', 'zh': '必填'},
    'invalid_email': {'en': 'Invalid email', 'th': 'อีเมลไม่ถูกต้อง', 'zh': '邮箱格式无效'},
    'invalid_phone': {'en': 'Invalid phone number', 'th': 'เบอร์โทรศัพท์ไม่ถูกต้อง', 'zh': '电话号码无效'},
    'min_6_chars': {'en': 'Min 6 characters', 'th': 'อย่างน้อย 6 ตัวอักษร', 'zh': '最少6个字符'},
    'min_8_chars': {'en': 'Min 8 characters', 'th': 'อย่างน้อย 8 ตัวอักษร', 'zh': '最少8个字符'},
    'kyc_ai_notice': {'en': 'AI will verify your ID card and selfie. Please ensure photos are clear and properly oriented.', 'th': 'AI จะตรวจสอบบัตรประชาชนและเซลฟี่ของคุณ กรุณาถ่ายภาพให้ชัดเจนและถูกต้อง', 'zh': 'AI将验证您的身份证和自拍照。请确保照片清晰且方向正确。'},
    'kyc_file_too_small': {'en': 'Image file too small (min 10KB)', 'th': 'ไฟล์รูปเล็กเกินไป (ขั้นต่ำ 10KB)', 'zh': '图片文件太小（最小10KB）'},
    'kyc_file_too_large': {'en': 'Image file too large (max 20MB)', 'th': 'ไฟล์รูปใหญ่เกินไป (สูงสุด 20MB)', 'zh': '图片文件太大（最大20MB）'},
    'kyc_too_small': {'en': 'Image too small (min 200×150 pixels)', 'th': 'รูปเล็กเกินไป (ขั้นต่ำ 200×150 พิกเซล)', 'zh': '图片太小（最小200×150像素）'},
    'kyc_too_large_dims': {'en': 'Image dimensions too large', 'th': 'ขนาดรูปใหญ่เกินไป', 'zh': '图片尺寸过大'},
    'kyc_id_landscape': {'en': 'ID card should be landscape orientation', 'th': 'บัตรประชาชนควรเป็นแนวนอน', 'zh': '身份证应为横向照片'},
    'kyc_id_not_card': {'en': 'AI detected this is not an ID card photo', 'th': 'AI ตรวจพบว่ารูปนี้ไม่ใช่บัตรประชาชน', 'zh': 'AI检测到此图不是身份证照片'},
    'kyc_selfie_too_wide': {'en': 'Selfie photo is too wide — please take a portrait photo', 'th': 'รูปเซลฟี่กว้างเกินไป — กรุณาถ่ายแนวตั้ง', 'zh': '自拍照太宽 — 请拍摄竖版照片'},
    'kyc_selfie_too_small': {'en': 'Selfie too small — please take a clearer photo', 'th': 'เซลฟี่เล็กเกินไป — กรุณาถ่ายรูปที่ชัดกว่านี้', 'zh': '自拍照太小 — 请拍摄更清晰的照片'},
    'kyc_invalid_format': {'en': 'Invalid image format — only JPEG/PNG accepted', 'th': 'รูปแบบไฟล์ไม่ถูกต้อง — รองรับเฉพาะ JPEG/PNG', 'zh': '图片格式无效 — 仅支持JPEG/PNG'},
    'kyc_read_error': {'en': 'Cannot read image file', 'th': 'ไม่สามารถอ่านไฟล์รูปภาพ', 'zh': '无法读取图片文件'},
    'passwords_mismatch': {'en': 'Passwords do not match', 'th': 'รหัสผ่านไม่ตรงกัน', 'zh': '密码不匹配'},
    'next': {'en': 'Next', 'th': 'ถัดไป', 'zh': '下一步'},
    'back': {'en': 'Back', 'th': 'ย้อนกลับ', 'zh': '返回'},
    'captured': {'en': 'Captured ✓', 'th': 'ถ่ายแล้ว ✓', 'zh': '已拍摄 ✓'},
    'uploaded': {'en': 'Uploaded ✓', 'th': 'อัปโหลดแล้ว ✓', 'zh': '已上传 ✓'},
    'camera': {'en': 'Camera', 'th': 'กล้อง', 'zh': '相机'},
    'gallery': {'en': 'Gallery', 'th': 'คลังรูป', 'zh': '相册'},
    'kyc_up_to_date': {'en': 'KYC verification is up to date ✓', 'th': 'KYC เป็นปัจจุบัน ✓', 'zh': 'KYC已更新 ✓'},
    'portfolio_ok': {'en': 'Portfolio uploaded ✓', 'th': 'ผลงานอัปโหลดแล้ว ✓', 'zh': '作品已上传 ✓'},
    'date_label': {'en': 'Date', 'th': 'วันที่', 'zh': '日期'},
    'ok': {'en': 'OK', 'th': 'ตกลง', 'zh': '好的'},
    'all': {'en': 'All', 'th': 'ทั้งหมด', 'zh': '全部'},
    'images_count': {'en': 'images', 'th': 'รูป', 'zh': '张图片'},
    'files_count': {'en': 'files (images, PDF, DOCX, XLSX)', 'th': 'ไฟล์ (รูป, PDF, DOCX, XLSX)', 'zh': '文件（图片、PDF、DOCX、XLSX）'},
    // AI evaluation phases
    'kyc_check': {'en': 'KYC Verification', 'th': 'ยืนยันตัวตน KYC', 'zh': 'KYC身份验证'},
    'company_check': {'en': 'Company Validation', 'th': 'ตรวจสอบบริษัท', 'zh': '公司验证'},
    'credentials': {'en': 'Credentials Analysis', 'th': 'วิเคราะห์คุณสมบัติ', 'zh': '资质分析'},
    'experience': {'en': 'Experience Assessment', 'th': 'ประเมินประสบการณ์', 'zh': '经验评估'},
    'fraud_scan': {'en': 'Fraud Detection Scan', 'th': 'สแกนตรวจจับการฉ้อโกง', 'zh': '欺诈检测扫描'},
    'ocr_analysis': {'en': '📄 AI OCR Document Analysis', 'th': '📄 AI OCR วิเคราะห์เอกสาร', 'zh': '📄 AI OCR文档分析'},
    'portfolio_ocr': {'en': 'Portfolio OCR & Analysis', 'th': 'วิเคราะห์ OCR ผลงาน', 'zh': '作品集OCR和分析'},
    'price_list_eval': {'en': 'Price List Evaluation', 'th': 'ประเมินรายการราคา', 'zh': '价格表评估'},
    'tier_assign': {'en': 'Tier Assignment', 'th': 'กำหนดระดับ', 'zh': '等级分配'},
    'confirm_delete_msg': {'en': 'Are you sure you want to delete this?', 'th': 'คุณแน่ใจหรือไม่ว่าต้องการลบ?', 'zh': '您确定要删除吗？'},
    'title': {'en': 'Title', 'th': 'ชื่อ', 'zh': '标题'},
    'edit_property': {'en': 'Edit Property', 'th': 'แก้ไขอสังหาฯ', 'zh': '编辑房产'},
    'views': {'en': 'views', 'th': 'ครั้งดู', 'zh': '次查看'},
    'profile_updated': {'en': 'Profile updated ✓', 'th': 'อัปเดตโปรไฟล์แล้ว ✓', 'zh': '个人资料已更新 ✓'},
    'plumbing_repair': {'en': 'Plumbing repair', 'th': 'ซ่อมประปา', 'zh': '水管维修'},
    'time_10m': {'en': '10 min ago', 'th': '10 นาทีที่ผ่านมา', 'zh': '10分钟前'},
    'time_2h': {'en': '2 hours ago', 'th': '2 ชั่วโมงที่ผ่านมา', 'zh': '2小时前'},
    'time_1d': {'en': '1 day ago', 'th': '1 วันที่ผ่านมา', 'zh': '1天前'},
    'time_2d': {'en': '2 days ago', 'th': '2 วันที่ผ่านมา', 'zh': '2天前'},
    'time_3d': {'en': '3 days ago', 'th': '3 วันที่ผ่านมา', 'zh': '3天前'},
    'time_4d': {'en': '4 days ago', 'th': '4 วันที่ผ่านมา', 'zh': '4天前'},
    'tier_upgraded': {'en': 'Tier upgraded!', 'th': 'อัปเกรดระดับแล้ว!', 'zh': '等级已升级！'},
    'modern_condo': {'en': 'Modern Condo', 'th': 'คอนโดทันสมัย', 'zh': '现代公寓'},
    // Skill names
    'plumbing': {'en': 'Plumbing', 'th': 'ประปา', 'zh': '水管'},
    'electrical': {'en': 'Electrical', 'th': 'ไฟฟ้า', 'zh': '电气'},
    'ac_install': {'en': 'AC Installation', 'th': 'ติดตั้งแอร์', 'zh': '空调安装'},
    'general_maint': {'en': 'General Maintenance', 'th': 'ซ่อมบำรุงทั่วไป', 'zh': '一般维修'},
  };

  static String get(String key, String locale) {
    return _t[key]?[locale] ?? _t[key]?['en'] ?? key;
  }
}

// ---------------------------------------------------------------------------
// Locale Provider
// ---------------------------------------------------------------------------
class LocaleProvider extends ChangeNotifier {
  String _locale = 'en';
  final _storage = const FlutterSecureStorage();

  String get locale => _locale;

  LocaleProvider() {
    _load();
  }

  Future<void> _load() async {
    final saved = await _storage.read(key: 'partner_locale');
    if (saved != null) {
      _locale = saved;
      notifyListeners();
    }
  }

  String t(String key) => Translations.get(key, _locale);

  Future<void> setLocale(String l) async {
    _locale = l;
    await _storage.write(key: 'partner_locale', value: l);
    notifyListeners();
  }
}

// ---------------------------------------------------------------------------
// Auth Provider
// ---------------------------------------------------------------------------
class AuthProvider extends ChangeNotifier {
  final _storage = const FlutterSecureStorage();
  Map<String, dynamic>? _user;
  bool _isLoggedIn = false;
  bool _pdpaConsent = false;

  Map<String, dynamic>? get user => _user;
  bool get isLoggedIn => _isLoggedIn;
  bool get pdpaConsent => _pdpaConsent;
  String get displayName => _user?['name'] ?? 'Partner';
  String get email => _user?['email'] ?? '';
  String get tier => _user?['tier'] ?? 'Standard';
  String get category => _user?['category'] ?? 'household';

  AuthProvider() {
    _load();
  }

  Future<void> _load() async {
    final raw = await _storage.read(key: 'partner_user');
    final token = await _storage.read(key: 'partner_token');
    final pdpa = await _storage.read(key: 'partner_pdpa_consent');
    if (raw != null && token != null) {
      _user = jsonDecode(raw);
      _isLoggedIn = true;
      _pdpaConsent = pdpa == 'true';
      notifyListeners();
    }
  }

  Future<void> login(Map<String, dynamic> userData, String token) async {
    _user = userData;
    _isLoggedIn = true;
    await _storage.write(key: 'partner_user', value: jsonEncode(userData));
    await _storage.write(key: 'partner_token', value: token);
    notifyListeners();
  }

  Future<void> acceptPdpa() async {
    _pdpaConsent = true;
    await _storage.write(key: 'partner_pdpa_consent', value: 'true');
    notifyListeners();
  }

  Future<void> logout() async {
    _user = null;
    _isLoggedIn = false;
    _pdpaConsent = false;
    await _storage.deleteAll();
    notifyListeners();
  }
}
