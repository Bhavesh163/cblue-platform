import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../core/providers.dart';

class OverviewTab extends StatelessWidget {
  const OverviewTab({super.key});

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final auth = context.watch<AuthProvider>();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Welcome card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppTheme.primaryBlue, Color(0xFF0369A1)],
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${locale.locale == 'th' ? 'สวัสดี' : locale.locale == 'zh' ? '你好' : 'Hello'}, ${auth.displayName}',
                  style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text(
                  locale.locale == 'th'
                      ? 'ยินดีต้อนรับสู่ CBLUE แพลตฟอร์ม'
                      : locale.locale == 'zh'
                          ? '欢迎来到CBLUE平台'
                          : 'Welcome to CBLUE Platform',
                  style: const TextStyle(color: Colors.white70, fontSize: 14),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Quick stats
          Row(
            children: [
              _StatCard(
                icon: Icons.handyman,
                label: locale.t('activeJobs'),
                value: '2',
                color: AppTheme.primaryBlue,
              ),
              const SizedBox(width: 12),
              _StatCard(
                icon: Icons.check_circle,
                label: locale.t('completed'),
                value: '15',
                color: AppTheme.success,
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _StatCard(
                icon: Icons.apartment,
                label: locale.t('properties'),
                value: '3',
                color: AppTheme.primaryGreen,
              ),
              const SizedBox(width: 12),
              _StatCard(
                icon: Icons.star,
                label: locale.locale == 'th' ? 'คะแนนเฉลี่ย' : locale.locale == 'zh' ? '平均评分' : 'Avg Rating',
                value: '4.8',
                color: AppTheme.star,
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Quick book cards
          Text(
            locale.t('bookFixers'),
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          _QuickBookCard(
            icon: Icons.home_repair_service,
            title: locale.t('bookHousehold'),
            subtitle: locale.locale == 'th' ? 'ประปา, ไฟฟ้า, แอร์, ตกแต่ง' : locale.locale == 'zh' ? '水管, 电气, 空调, 装修' : 'Plumbing, Electrical, AC, Interior',
            color: AppTheme.primaryBlue,
          ),
          const SizedBox(height: 8),
          _QuickBookCard(
            icon: Icons.engineering,
            title: locale.t('bookProject'),
            subtitle: locale.locale == 'th' ? 'เว็บ, แอป, AI, โซลาร์, EV' : locale.locale == 'zh' ? '网站, 应用, AI, 太阳能, EV' : 'Web, App, AI, Solar, EV',
            color: AppTheme.primaryGreen,
          ),
          const SizedBox(height: 8),
          _QuickBookCard(
            icon: Icons.person_search,
            title: locale.t('bookProfessional'),
            subtitle: locale.locale == 'th' ? 'ทนายความ, สถาปนิก, วิศวกร, CPA' : locale.locale == 'zh' ? '律师, 建筑师, 工程师, CPA' : 'Lawyer, Architect, Engineer, CPA',
            color: const Color(0xFF7C3AED),
          ),
          const SizedBox(height: 8),
          _QuickBookCard(
            icon: Icons.apartment,
            title: locale.t('browseProperties'),
            subtitle: locale.locale == 'th' ? 'คอนโด, บ้าน, ที่ดิน, อาคาร' : locale.locale == 'zh' ? '公寓, 别墅, 土地, 商业' : 'Condo, House, Land, Commercial',
            color: const Color(0xFFEA580C),
          ),
          const SizedBox(height: 24),

          // Recent activity
          Text(
            locale.locale == 'th' ? 'กิจกรรมล่าสุด' : locale.locale == 'zh' ? '最近活动' : 'Recent Activity',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          _ActivityItem(
            icon: Icons.handyman,
            title: locale.locale == 'th' ? 'ซ่อมแอร์ - กำลังดำเนินการ' : locale.locale == 'zh' ? '空调维修 - 进行中' : 'AC Repair - In Progress',
            time: locale.locale == 'th' ? '2 ชั่วโมงที่ผ่านมา' : locale.locale == 'zh' ? '2小时前' : '2 hours ago',
          ),
          _ActivityItem(
            icon: Icons.apartment,
            title: locale.locale == 'th' ? 'คอนโดสุขุมวิท - นัดชม' : locale.locale == 'zh' ? '素坤逸公寓 - 已预约' : 'Sukhumvit Condo - Viewing',
            time: locale.locale == 'th' ? '1 วันที่ผ่านมา' : locale.locale == 'zh' ? '1天前' : '1 day ago',
          ),
          _ActivityItem(
            icon: Icons.check_circle,
            title: locale.locale == 'th' ? 'ซ่อมท่อน้ำ - เสร็จสิ้น' : locale.locale == 'zh' ? '水管维修 - 已完成' : 'Plumbing Fix - Completed',
            time: locale.locale == 'th' ? '3 วันที่ผ่านมา' : locale.locale == 'zh' ? '3天前' : '3 days ago',
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatCard({required this.icon, required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 8, offset: const Offset(0, 2))],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
                  Text(label, style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary), overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickBookCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;

  const _QuickBookCard({required this.icon, required this.title, required this.subtitle, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.borderLight),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 28),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                const SizedBox(height: 2),
                Text(subtitle, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
              ],
            ),
          ),
          Icon(Icons.chevron_right, color: AppTheme.textMuted),
        ],
      ),
    );
  }
}

class _ActivityItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String time;

  const _ActivityItem({required this.icon, required this.title, required this.time});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(icon, size: 20, color: AppTheme.textSecondary),
          const SizedBox(width: 12),
          Expanded(child: Text(title, style: const TextStyle(fontSize: 14))),
          Text(time, style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
        ],
      ),
    );
  }
}
