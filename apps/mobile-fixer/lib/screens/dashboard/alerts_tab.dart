import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/providers.dart';
import '../../core/theme.dart';

class AlertsTab extends StatefulWidget {
  const AlertsTab({super.key});

  @override
  State<AlertsTab> createState() => _AlertsTabState();
}

class _AlertsTabState extends State<AlertsTab> {
  List<Map<String, dynamic>>? _alerts;

  List<Map<String, dynamic>> _buildAlerts(String Function(String) t) {
    return [
      {'title': '${t('new_job_request')}: Customer #C1032', 'type': 'job', 'time': t('time_10m'), 'read': false},
      {'title': '${t('payment_received')}: ฿1,500', 'type': 'payment', 'time': t('time_2h'), 'read': false},
      {'title': '${t('system_update')}: ${t('tier_upgraded')}', 'type': 'tier', 'time': t('time_1d'), 'read': true},
      {'title': '${t('review_received')}: ⭐⭐⭐⭐⭐', 'type': 'review', 'time': t('time_2d'), 'read': true},
      {'title': '${t('job_reminder')}: PO-2506-0049', 'type': 'reminder', 'time': t('time_3d'), 'read': true},
      {'title': '${t('properties')}: ${t('modern_condo')} ${t('approved')}', 'type': 'property', 'time': t('time_4d'), 'read': true},
    ];
  }

  IconData _iconFor(String type) {
    switch (type) {
      case 'job': return Icons.work;
      case 'payment': return Icons.payment;
      case 'tier': return Icons.trending_up;
      case 'review': return Icons.star;
      case 'reminder': return Icons.alarm;
      case 'property': return Icons.apartment;
      default: return Icons.notifications;
    }
  }

  Color _colorFor(String type) {
    switch (type) {
      case 'job': return AppTheme.primaryBlue;
      case 'payment': return AppTheme.primaryGreen;
      case 'tier': return AppTheme.warningOrange;
      case 'review': return AppTheme.warningOrange;
      case 'reminder': return AppTheme.primaryBlue;
      case 'property': return AppTheme.primaryGreen;
      default: return AppTheme.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = context.watch<LocaleProvider>().t;
    _alerts ??= _buildAlerts(t);
    final alerts = _alerts!;

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: alerts.length,
      itemBuilder: (_, i) {
        final a = alerts[i];
        final isRead = a['read'] as bool;
        final type = a['type'] as String;

        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          color: isRead ? null : AppTheme.primaryBlue.withValues(alpha: 0.04),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: _colorFor(type).withValues(alpha: 0.1),
              child: Icon(_iconFor(type), color: _colorFor(type), size: 20),
            ),
            title: Text(a['title'] as String, style: TextStyle(fontSize: 14, fontWeight: isRead ? FontWeight.normal : FontWeight.w600)),
            subtitle: Text(a['time'] as String, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
            trailing: isRead ? null : Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppTheme.primaryBlue, shape: BoxShape.circle)),
            onTap: () => setState(() => alerts[i] = {...a, 'read': true}),
          ),
        );
      },
    );
  }
}
