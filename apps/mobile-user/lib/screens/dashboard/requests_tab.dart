import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../core/providers.dart';

class RequestsTab extends StatelessWidget {
  const RequestsTab({super.key});

  static final List<Map<String, dynamic>> _demoRequests = [
    {
      'service': {'en': 'Kitchen Renovation', 'th': 'ปรับปรุงครัว', 'zh': '厨房翻新'},
      'type': 'household',
      'status': 'MATCHING',
      'date': '2026-04-11',
      'description': {'en': 'Full kitchen renovation with new cabinets', 'th': 'ปรับปรุงครัวใหม่พร้อมตู้', 'zh': '全新厨柜厨房翻新'},
    },
    {
      'service': {'en': 'Website Development', 'th': 'พัฒนาเว็บไซต์', 'zh': '网站开发'},
      'type': 'project',
      'status': 'PENDING',
      'date': '2026-04-09',
      'description': {'en': 'E-commerce website with payment gateway', 'th': 'เว็บอีคอมเมิร์ซพร้อมระบบชำระเงิน', 'zh': '带支付的电商网站'},
    },
    {
      'service': {'en': 'Architect Consultation', 'th': 'ปรึกษาสถาปนิก', 'zh': '建筑师咨询'},
      'type': 'professional',
      'status': 'MATCHING',
      'date': '2026-04-13',
      'description': {'en': 'House design review and permit assistance', 'th': 'ตรวจสอบแบบบ้านและช่วยเรื่องใบอนุญาต', 'zh': '房屋设计审查和许可协助'},
    },
  ];

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _demoRequests.length,
      itemBuilder: (context, i) {
        final req = _demoRequests[i];
        final service = req['service'] as Map<String, String>;
        final desc = req['description'] as Map<String, String>;
        final status = req['status'] as String;

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        service[locale.locale] ?? service['en']!,
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: status == 'MATCHING'
                            ? AppTheme.primaryBlue.withValues(alpha: 0.1)
                            : AppTheme.warning.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        status == 'MATCHING' ? locale.t('aiMatching') : locale.t('pending'),
                        style: TextStyle(
                          color: status == 'MATCHING' ? AppTheme.primaryBlue : AppTheme.warning,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  desc[locale.locale] ?? desc['en']!,
                  style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    _TypeChip(type: req['type']),
                    const SizedBox(width: 12),
                    Icon(Icons.calendar_today, size: 14, color: AppTheme.textMuted),
                    const SizedBox(width: 4),
                    Text(req['date'], style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('${locale.t('cancel')}: ${service[locale.locale] ?? service['en']!}'), duration: const Duration(seconds: 2)),
                        );
                      },
                      child: Text(locale.t('cancel')),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: () {
                        showDialog(
                          context: context,
                          builder: (_) => AlertDialog(
                            title: Text(service[locale.locale] ?? service['en']!),
                            content: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(desc[locale.locale] ?? desc['en']!),
                                const SizedBox(height: 12),
                                Text('${locale.t('status_label')}: $status', style: const TextStyle(fontWeight: FontWeight.w600)),
                                Text('${locale.t('date_label')}: ${req['date']}', style: const TextStyle(color: AppTheme.textSecondary)),
                              ],
                            ),
                            actions: [
                              TextButton(onPressed: () => Navigator.pop(context), child: Text(locale.t('ok'))),
                            ],
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8)),
                      child: Text(
                        locale.locale == 'th' ? 'ดูรายละเอียด' : locale.locale == 'zh' ? '查看详情' : 'View Details',
                        style: const TextStyle(fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _TypeChip extends StatelessWidget {
  final String type;

  const _TypeChip({required this.type});

  @override
  Widget build(BuildContext context) {
    IconData icon;
    Color color;
    switch (type) {
      case 'household':
        icon = Icons.home_repair_service;
        color = AppTheme.primaryBlue;
        break;
      case 'project':
        icon = Icons.engineering;
        color = AppTheme.primaryGreen;
        break;
      case 'professional':
        icon = Icons.person_search;
        color = const Color(0xFF7C3AED);
        break;
      default:
        icon = Icons.task;
        color = AppTheme.textMuted;
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 4),
        Text(type[0].toUpperCase() + type.substring(1), style: TextStyle(fontSize: 12, color: color, fontWeight: FontWeight.w500)),
      ],
    );
  }
}
