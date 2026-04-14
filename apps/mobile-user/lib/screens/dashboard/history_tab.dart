import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../core/providers.dart';

class HistoryTab extends StatelessWidget {
  const HistoryTab({super.key});

  static final List<Map<String, dynamic>> _demoHistory = [
    {
      'service': {'en': 'Plumbing Repair', 'th': 'ซ่อมประปา', 'zh': '水管维修'},
      'partner': 'FIX-0891',
      'date': '2026-03-20',
      'status': 'COMPLETED',
      'fee': '฿200',
      'rating': 5,
      'tier': 'Economy',
    },
    {
      'service': {'en': 'Electrical Installation', 'th': 'ติดตั้งไฟฟ้า', 'zh': '电气安装'},
      'partner': 'FIX-0742',
      'date': '2026-03-05',
      'status': 'COMPLETED',
      'fee': '฿400',
      'rating': 4,
      'tier': 'Standard',
    },
    {
      'service': {'en': 'AI Integration', 'th': 'AI Integration', 'zh': 'AI集成'},
      'partner': 'PRO-0113',
      'date': '2026-02-15',
      'status': 'COMPLETED',
      'fee': '฿600',
      'rating': 5,
      'tier': 'Corporate',
    },
    {
      'service': {'en': 'Architect Review', 'th': 'ตรวจแบบสถาปนิก', 'zh': '建筑审查'},
      'partner': 'PRO-0078',
      'date': '2026-01-22',
      'status': 'COMPLETED',
      'fee': '฿800',
      'rating': 4,
      'tier': 'Specialist',
    },
    {
      'service': {'en': 'Interior Design', 'th': 'ออกแบบภายใน', 'zh': '室内设计'},
      'partner': 'PRO-0045',
      'date': '2026-01-10',
      'status': 'COMPLETED',
      'fee': '฿1000',
      'rating': 5,
      'tier': 'Expert',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _demoHistory.length,
      itemBuilder: (context, i) {
        final item = _demoHistory[i];
        final service = item['service'] as Map<String, String>;

        return Card(
          margin: const EdgeInsets.only(bottom: 10),
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            leading: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppTheme.success.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.check_circle, color: AppTheme.success, size: 24),
            ),
            title: Text(
              service[locale.locale] ?? service['en']!,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 4),
                Row(
                  children: [
                    Text(item['partner'], style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                    const SizedBox(width: 8),
                    Text(item['tier'], style: TextStyle(fontSize: 11, color: AppTheme.primaryBlue)),
                    const SizedBox(width: 8),
                    Text(item['date'], style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    ...List.generate(5, (j) => Icon(
                      Icons.star,
                      size: 14,
                      color: j < (item['rating'] as int) ? AppTheme.star : AppTheme.borderLight,
                    )),
                    const SizedBox(width: 8),
                    Text(
                      '${locale.t('processingFee')}: ${item['fee']}',
                      style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
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
