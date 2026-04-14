import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/providers.dart';
import '../../core/theme.dart';
import '../../core/constants.dart';
import '../../services/api_service.dart';

class ActiveJobsTab extends StatefulWidget {
  const ActiveJobsTab({super.key});

  @override
  State<ActiveJobsTab> createState() => _ActiveJobsTabState();
}

class _ActiveJobsTabState extends State<ActiveJobsTab> {
  final _api = ApiService();
  bool _completing = false;

  final List<Map<String, dynamic>> _jobs = [
    {'id': 'PO-2506-0051', 'service': 'Plumbing Repair', 'customer': 'Customer #C1024', 'status': 'in_progress', 'progress': 0.6, 'fee': 200.0, 'date': '2025-06-28'},
    {'id': 'PO-2506-0049', 'service': 'Electrical Wiring', 'customer': 'Customer #C0998', 'status': 'confirmed', 'progress': 0.2, 'fee': 400.0, 'date': '2025-06-30'},
    {'id': 'PO-2506-0045', 'service': 'AC Installation', 'customer': 'Customer #C1001', 'status': 'in_progress', 'progress': 0.85, 'fee': 600.0, 'date': '2025-06-25'},
  ];

  Future<void> _completeJob(int index) async {
    final job = _jobs[index];
    setState(() => _completing = true);
    try {
      await _api.completeJob(job['id'] as String);
    } catch (_) { /* Demo mode: continue anyway */ }
    if (mounted) {
      setState(() {
        _jobs[index]['status'] = 'completed';
        _jobs[index]['progress'] = 1.0;
        _completing = false;
      });
      final t = context.read<LocaleProvider>().t;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${t('job_completed')}: ${job['id']}'), backgroundColor: AppTheme.primaryGreen),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = context.watch<LocaleProvider>().t;
    final locale = context.watch<LocaleProvider>().locale;

    final active = _jobs.where((j) => j['status'] != 'completed').toList();

    if (active.isEmpty) {
      return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.work_off, size: 64, color: AppTheme.textSecondary),
        const SizedBox(height: 12),
        Text(t('no_jobs'), style: const TextStyle(color: AppTheme.textSecondary, fontSize: 16)),
      ]));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: active.length,
      itemBuilder: (_, i) {
        final j = active[i];
        final status = j['status'] as String;
        final progress = j['progress'] as double;
        final statusLabel = AppConstants.statusLabels[status]?[locale] ?? status;

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(child: Text(j['id'] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16))),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: status == 'in_progress' ? AppTheme.primaryGreen.withValues(alpha: 0.1) : AppTheme.primaryBlue.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(statusLabel, style: TextStyle(
                    fontSize: 12, fontWeight: FontWeight.w600,
                    color: status == 'in_progress' ? AppTheme.primaryGreen : AppTheme.primaryBlue,
                  )),
                ),
              ]),
              const SizedBox(height: 8),
              Text(j['service'] as String, style: const TextStyle(fontSize: 15)),
              const SizedBox(height: 4),
              Text(j['customer'] as String, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
              const SizedBox(height: 4),
              Text('Date: ${j['date']}', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
              const SizedBox(height: 12),
              // Progress bar
              Row(children: [
                Expanded(child: ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(value: progress, minHeight: 8,
                    backgroundColor: AppTheme.surfaceGrey,
                    valueColor: AlwaysStoppedAnimation(progress > 0.7 ? AppTheme.primaryGreen : AppTheme.primaryBlue)),
                )),
                const SizedBox(width: 8),
                Text('${(progress * 100).toInt()}%', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              ]),
              const SizedBox(height: 12),
              Row(children: [
                Text('${t('processing_fee')}: ฿${(j['fee'] as double).toStringAsFixed(0)}',
                    style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
                const Spacer(),
                if (progress < 1.0)
                  ElevatedButton.icon(
                    onPressed: _completing ? null : () => _completeJob(_jobs.indexOf(j)),
                    icon: _completing
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.check, size: 16),
                    label: Text(t('complete_job'), style: const TextStyle(fontSize: 13)),
                    style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8)),
                  ),
              ]),
            ]),
          ),
        );
      },
    );
  }
}
