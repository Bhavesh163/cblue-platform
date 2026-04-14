import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/providers.dart';
import '../../core/theme.dart';
import '../../services/api_service.dart';

class IncomingTab extends StatefulWidget {
  const IncomingTab({super.key});

  @override
  State<IncomingTab> createState() => _IncomingTabState();
}

class _IncomingTabState extends State<IncomingTab> {
  final _api = ApiService();
  int _processingIdx = -1;

  final List<Map<String, dynamic>> _requests = [
    {'id': 'REQ-2506-0088', 'service': {'en': 'Water Heater Installation', 'th': 'ติดตั้งเครื่องทำน้ำร้อน', 'zh': '热水器安装'}, 'customer': 'Customer #C1032', 'urgency': 'high', 'budget': '฿2,500', 'location': 'Bangkok 10110', 'date': '2025-07-01', 'desc': {'en': 'Need hot water heater installed in master bathroom.', 'th': 'ต้องการติดตั้งเครื่องทำน้ำร้อนในห้องน้ำหลัก', 'zh': '需要在主浴室安装热水器'}},
    {'id': 'REQ-2506-0085', 'service': {'en': 'Painting (2 rooms)', 'th': 'ทาสี (2 ห้อง)', 'zh': '刷漆（2间）'}, 'customer': 'Customer #C1028', 'urgency': 'medium', 'budget': '฿4,000', 'location': 'Bangkok 10120', 'date': '2025-07-03', 'desc': {'en': 'Two bedrooms need repainting. Approximately 40 sqm total.', 'th': 'ห้องนอน 2 ห้องต้องทาสีใหม่ รวมประมาณ 40 ตร.ม.', 'zh': '两间卧室需重新粉刷，总计约40平方米'}},
    {'id': 'REQ-2506-0082', 'service': {'en': 'AC Maintenance', 'th': 'บำรุงรักษาแอร์', 'zh': '空调维保'}, 'customer': 'Customer #C1020', 'urgency': 'low', 'budget': '฿800', 'location': 'Bangkok 10150', 'date': '2025-07-05', 'desc': {'en': 'Annual AC servicing for 3 wall-mounted units.', 'th': 'บริการแอร์ประจำปี 3 เครื่อง', 'zh': '三台壁挂式空调年度保养'}},
  ];

  Future<void> _acceptJob(int index) async {
    final r = _requests[index];
    setState(() => _processingIdx = index);
    try {
      await _api.acceptJob(r['id'] as String);
    } catch (_) { /* Demo mode */ }
    if (mounted) {
      final t = context.read<LocaleProvider>().t;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${t('job_accepted')}: ${r['id']}'), backgroundColor: AppTheme.primaryGreen),
      );
      setState(() { _requests.removeAt(index); _processingIdx = -1; });
    }
  }

  Future<void> _declineJob(int index) async {
    final r = _requests[index];
    setState(() => _processingIdx = index);
    try {
      await _api.declineJob(r['id'] as String);
    } catch (_) { /* Demo mode */ }
    if (mounted) {
      final t = context.read<LocaleProvider>().t;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${t('job_declined')}: ${r['id']}'), backgroundColor: AppTheme.warningOrange),
      );
      setState(() { _requests.removeAt(index); _processingIdx = -1; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = context.watch<LocaleProvider>().t;
    final locale = context.watch<LocaleProvider>().locale;

    if (_requests.isEmpty) {
      return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.inbox, size: 64, color: AppTheme.textSecondary),
        const SizedBox(height: 12),
        Text(t('no_jobs'), style: const TextStyle(color: AppTheme.textSecondary, fontSize: 16)),
      ]));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _requests.length,
      itemBuilder: (_, i) {
        final r = _requests[i];
        final urgency = r['urgency'] as String;
        final urgencyColor = urgency == 'high' ? AppTheme.errorRed : urgency == 'medium' ? AppTheme.warningOrange : AppTheme.primaryGreen;

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(child: Text(r['id'] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15))),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: urgencyColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                  child: Text(t('urgency_$urgency'), style: TextStyle(color: urgencyColor, fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ]),
              const SizedBox(height: 8),
              Text((r['service'] as Map)[locale] ?? (r['service'] as Map)['en'], style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
              const SizedBox(height: 4),
              Text((r['desc'] as Map)[locale] ?? (r['desc'] as Map)['en'], style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13), maxLines: 2, overflow: TextOverflow.ellipsis),
              const SizedBox(height: 8),
              Wrap(spacing: 16, children: [
                _InfoChip(icon: Icons.person, text: r['customer'] as String),
                _InfoChip(icon: Icons.location_on, text: r['location'] as String),
                _InfoChip(icon: Icons.calendar_today, text: r['date'] as String),
                _InfoChip(icon: Icons.monetization_on, text: r['budget'] as String),
              ]),
              const SizedBox(height: 16),
              Row(children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _processingIdx >= 0 ? null : () => _declineJob(i),
                    icon: const Icon(Icons.close, size: 16),
                    label: Text(t('decline')),
                    style: OutlinedButton.styleFrom(foregroundColor: AppTheme.errorRed),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _processingIdx >= 0 ? null : () => _acceptJob(i),
                    icon: _processingIdx == i
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.check, size: 16),
                    label: Text(t('accept')),
                  ),
                ),
              ]),
            ]),
          ),
        );
      },
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String text;
  const _InfoChip({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(icon, size: 14, color: AppTheme.textSecondary),
      const SizedBox(width: 4),
      Text(text, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
    ]);
  }
}
