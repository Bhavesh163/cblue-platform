import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../core/constants.dart';
import '../../core/providers.dart';

class ActiveJobsTab extends StatelessWidget {
  const ActiveJobsTab({super.key});

  static final List<Map<String, dynamic>> _demoJobs = [
    {
      'service': {'en': 'AC Repair', 'th': 'ซ่อมแอร์', 'zh': '空调维修'},
      'partnerId': 'FIX-1042',
      'tier': 'Standard',
      'status': 'IN_PROGRESS',
      'date': '2026-04-10',
      'progress': 0.65,
      'rating': 4.5,
    },
    {
      'service': {'en': 'Plumbing Fix', 'th': 'ซ่อมท่อน้ำ', 'zh': '水管维修'},
      'partnerId': 'FIX-0983',
      'tier': 'Economy',
      'status': 'CONFIRMED',
      'date': '2026-04-12',
      'progress': 0.3,
      'rating': 4.8,
    },
    {
      'service': {'en': 'Interior Design', 'th': 'ออกแบบภายใน', 'zh': '室内设计'},
      'partnerId': 'PRO-0221',
      'tier': 'Corporate',
      'status': 'DEPOSIT_PENDING',
      'date': '2026-04-15',
      'progress': 0.1,
      'rating': 0.0,
    },
    {
      'service': {'en': 'Electrical Wiring', 'th': 'เดินสายไฟ', 'zh': '电气布线'},
      'partnerId': 'FIX-1105',
      'tier': 'Specialist',
      'status': 'IN_PROGRESS',
      'date': '2026-04-08',
      'progress': 0.85,
      'rating': 4.2,
    },
  ];

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _demoJobs.length,
      itemBuilder: (context, i) {
        final job = _demoJobs[i];
        final service = job['service'] as Map<String, String>;
        final status = job['status'] as String;
        final statusLabel = AppConstants.statusLabels[status]?[locale.locale] ?? status;

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
                    _StatusBadge(status: status, label: statusLabel),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(Icons.person, size: 14, color: AppTheme.textSecondary),
                    const SizedBox(width: 4),
                    Text(job['partnerId'], style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
                    const SizedBox(width: 16),
                    _TierBadge(tier: job['tier']),
                    const SizedBox(width: 16),
                    Icon(Icons.calendar_today, size: 14, color: AppTheme.textSecondary),
                    const SizedBox(width: 4),
                    Text(job['date'], style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
                  ],
                ),
                const SizedBox(height: 12),
                // Progress bar
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: job['progress'],
                    backgroundColor: AppTheme.borderLight,
                    valueColor: AlwaysStoppedAnimation(
                      (job['progress'] as double) > 0.7 ? AppTheme.success : AppTheme.primaryBlue,
                    ),
                    minHeight: 6,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${((job['progress'] as double) * 100).toInt()}%',
                  style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
                ),
                if ((job['rating'] as double) > 0) ...[
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.star, size: 16, color: AppTheme.star),
                      const SizedBox(width: 4),
                      Text('${job['rating']}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                    ],
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;
  final String label;

  const _StatusBadge({required this.status, required this.label});

  @override
  Widget build(BuildContext context) {
    Color color;
    switch (status) {
      case 'IN_PROGRESS':
        color = AppTheme.primaryBlue;
        break;
      case 'CONFIRMED':
        color = AppTheme.success;
        break;
      case 'DEPOSIT_PENDING':
        color = AppTheme.warning;
        break;
      case 'COMPLETED':
        color = AppTheme.success;
        break;
      default:
        color = AppTheme.textMuted;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
    );
  }
}

class _TierBadge extends StatelessWidget {
  final String tier;

  const _TierBadge({required this.tier});

  @override
  Widget build(BuildContext context) {
    Color color;
    switch (tier) {
      case 'Economy':
        color = AppTheme.textSecondary;
        break;
      case 'Standard':
        color = AppTheme.primaryBlue;
        break;
      case 'Corporate':
        color = AppTheme.primaryGreen;
        break;
      case 'Specialist':
        color = const Color(0xFF7C3AED);
        break;
      case 'Expert':
        color = AppTheme.star;
        break;
      default:
        color = AppTheme.textMuted;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(tier, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
    );
  }
}
