import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../core/providers.dart';

class AlertsTab extends StatelessWidget {
  const AlertsTab({super.key});

  static final List<Map<String, dynamic>> _demoAlerts = [
    {
      'msg': {'en': 'Your AC repair is scheduled for tomorrow at 2 PM', 'th': 'การซ่อมแอร์นัดหมายพรุ่งนี้ บ่าย 2', 'zh': '您的空调维修预约在明天下午2点'},
      'time': {'en': '5m ago', 'th': '5 นาทีที่ผ่านมา', 'zh': '5分钟前'},
      'type': 'reminder',
      'read': false,
    },
    {
      'msg': {'en': 'Partner FIX-1042 confirmed the job', 'th': 'พาร์ทเนอร์ FIX-1042 ยืนยันงาน', 'zh': '合作伙伴FIX-1042已确认工作'},
      'time': {'en': '1h ago', 'th': '1 ชั่วโมงที่ผ่านมา', 'zh': '1小时前'},
      'type': 'confirmation',
      'read': false,
    },
    {
      'msg': {'en': 'Payment received for PO-2604-0031', 'th': 'ได้รับชำระเงินสำหรับ PO-2604-0031', 'zh': '已收到PO-2604-0031的付款'},
      'time': {'en': '3h ago', 'th': '3 ชั่วโมงที่ผ่านมา', 'zh': '3小时前'},
      'type': 'payment',
      'read': true,
    },
    {
      'msg': {'en': 'Rate your experience with Partner FIX-0891', 'th': 'ให้คะแนนประสบการณ์กับพาร์ทเนอร์ FIX-0891', 'zh': '评价您与合作伙伴FIX-0891的体验'},
      'time': {'en': '1d ago', 'th': '1 วันที่ผ่านมา', 'zh': '1天前'},
      'type': 'review',
      'read': true,
    },
    {
      'msg': {'en': 'Property viewing confirmed for Sukhumvit Condo', 'th': 'ยืนยันนัดชมคอนโดสุขุมวิท', 'zh': '素坤逸公寓看房已确认'},
      'time': {'en': '2d ago', 'th': '2 วันที่ผ่านมา', 'zh': '2天前'},
      'type': 'property',
      'read': true,
    },
  ];

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _demoAlerts.length,
      itemBuilder: (context, i) {
        final alert = _demoAlerts[i];
        final msg = alert['msg'] as Map<String, String>;
        final time = alert['time'] as Map<String, String>;
        final read = alert['read'] as bool;

        IconData icon;
        Color color;
        switch (alert['type']) {
          case 'reminder':
            icon = Icons.alarm;
            color = AppTheme.warning;
            break;
          case 'confirmation':
            icon = Icons.check_circle;
            color = AppTheme.success;
            break;
          case 'payment':
            icon = Icons.payment;
            color = AppTheme.primaryBlue;
            break;
          case 'review':
            icon = Icons.star;
            color = AppTheme.star;
            break;
          case 'property':
            icon = Icons.apartment;
            color = AppTheme.primaryGreen;
            break;
          default:
            icon = Icons.notifications;
            color = AppTheme.textMuted;
        }

        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          decoration: BoxDecoration(
            color: read ? Colors.white : AppTheme.primaryBlue.withValues(alpha: 0.03),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: read ? AppTheme.borderLight : AppTheme.primaryBlue.withValues(alpha: 0.2),
            ),
          ),
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            leading: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            title: Text(
              msg[locale.locale] ?? msg['en']!,
              style: TextStyle(
                fontSize: 14,
                fontWeight: read ? FontWeight.w400 : FontWeight.w600,
              ),
            ),
            subtitle: Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                time[locale.locale] ?? time['en']!,
                style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
              ),
            ),
            trailing: !read
                ? Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: AppTheme.primaryBlue,
                      shape: BoxShape.circle,
                    ),
                  )
                : null,
          ),
        );
      },
    );
  }
}
