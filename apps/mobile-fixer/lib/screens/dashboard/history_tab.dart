import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/providers.dart';
import '../../core/theme.dart';

class HistoryTab extends StatefulWidget {
  const HistoryTab({super.key});

  @override
  State<HistoryTab> createState() => _HistoryTabState();
}

class _HistoryTabState extends State<HistoryTab> {
  final List<Map<String, dynamic>> _history = [
    {'id': 'PO-2506-0040', 'service': {'en': 'General Maintenance', 'th': 'ซ่อมบำรุงทั่วไป', 'zh': '一般维护'}, 'customer': 'Customer #C0990', 'rating': 5.0, 'earned': '฿1,200', 'fee': '฿200', 'date': '2025-06-20', 'myRating': null},
    {'id': 'PO-2506-0035', 'service': {'en': 'Plumbing Emergency', 'th': 'ซ่อมท่อน้ำฉุกเฉิน', 'zh': '紧急水管维修'}, 'customer': 'Customer #C0985', 'rating': 4.5, 'earned': '฿2,800', 'fee': '฿400', 'date': '2025-06-18', 'myRating': 4},
    {'id': 'PO-2505-0028', 'service': {'en': 'Electrical Inspection', 'th': 'ตรวจสอบระบบไฟฟ้า', 'zh': '电气检查'}, 'customer': 'Customer #C0972', 'rating': 5.0, 'earned': '฿1,500', 'fee': '฿200', 'date': '2025-06-10', 'myRating': 5},
    {'id': 'PO-2505-0022', 'service': {'en': 'AC Repair', 'th': 'ซ่อมแอร์', 'zh': '空调维修'}, 'customer': 'Customer #C0960', 'rating': 4.0, 'earned': '฿900', 'fee': '฿200', 'date': '2025-06-05', 'myRating': null},
    {'id': 'PO-2505-0015', 'service': {'en': 'Painting (3 rooms)', 'th': 'ทาสี (3 ห้อง)', 'zh': '刷漆（3间）'}, 'customer': 'Customer #C0945', 'rating': 5.0, 'earned': '฿6,500', 'fee': '฿600', 'date': '2025-05-28', 'myRating': 5},
  ];

  void _showRateCustomerDialog(BuildContext context, String Function(String) t, int index) {
    int selectedRating = 5;
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text(t('rate_customer')),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            Text(_history[index]['customer'] as String, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 16),
            Row(mainAxisAlignment: MainAxisAlignment.center, children: List.generate(5, (i) =>
              GestureDetector(
                onTap: () => setDialogState(() => selectedRating = i + 1),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: Icon(
                    i < selectedRating ? Icons.star : Icons.star_border,
                    size: 36,
                    color: AppTheme.warningOrange,
                  ),
                ),
              ),
            )),
            const SizedBox(height: 8),
            Text('$selectedRating / 5', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: Text(t('cancel'))),
            ElevatedButton(
              onPressed: () {
                setState(() => _history[index]['myRating'] = selectedRating);
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('${t('rating_submitted')} ⭐ $selectedRating/5'), backgroundColor: AppTheme.primaryGreen),
                );
              },
              child: Text(t('submit_rating')),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final t = context.watch<LocaleProvider>().t;
    final locale = context.watch<LocaleProvider>().locale;

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _history.length,
      itemBuilder: (_, i) {
        final h = _history[i];
        final hasRated = h['myRating'] != null;
        return Card(
          margin: const EdgeInsets.only(bottom: 10),
          child: ListTile(
            contentPadding: const EdgeInsets.all(16),
            title: Row(children: [
              Expanded(child: Text(h['id'] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15))),
              Row(children: List.generate(5, (s) => Icon(
                s < (h['rating'] as double).floor() ? Icons.star : (s < (h['rating'] as double)) ? Icons.star_half : Icons.star_border,
                size: 16, color: AppTheme.warningOrange,
              ))),
            ]),
            subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const SizedBox(height: 6),
              Text((h['service'] as Map)[locale] ?? (h['service'] as Map)['en'], style: const TextStyle(fontSize: 14)),
              const SizedBox(height: 2),
              Text('${h['customer']}  •  ${h['date']}', style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
              const SizedBox(height: 8),
              Row(children: [
                Text('${t('earned')}: ${h['earned']}', style: const TextStyle(fontWeight: FontWeight.w600, color: AppTheme.primaryGreen)),
                const Spacer(),
                Text('${t('processing_fee')}: ${h['fee']}', style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
              ]),
              const SizedBox(height: 8),
              if (hasRated)
                Row(children: [
                  const Icon(Icons.check_circle, size: 14, color: AppTheme.primaryGreen),
                  const SizedBox(width: 4),
                  Text('${t('rate_customer')}: ${h['myRating']}⭐', style: const TextStyle(fontSize: 12, color: AppTheme.primaryGreen)),
                ])
              else
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => _showRateCustomerDialog(context, t, i),
                    icon: const Icon(Icons.star, size: 16),
                    label: Text(t('rate_customer'), style: const TextStyle(fontSize: 13)),
                    style: OutlinedButton.styleFrom(foregroundColor: AppTheme.warningOrange),
                  ),
                ),
            ]),
          ),
        );
      },
    );
  }
}
