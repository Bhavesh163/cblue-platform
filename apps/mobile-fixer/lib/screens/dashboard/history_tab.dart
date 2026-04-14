import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/providers.dart';
import '../../core/theme.dart';

class HistoryTab extends StatelessWidget {
  const HistoryTab({super.key});

  @override
  Widget build(BuildContext context) {
    final t = context.watch<LocaleProvider>().t;

    final history = [
      {'id': 'PO-2506-0040', 'service': 'General Maintenance', 'customer': 'Customer #C0990', 'rating': 5.0, 'earned': '฿1,200', 'fee': '฿250', 'date': '2025-06-20'},
      {'id': 'PO-2506-0035', 'service': 'Plumbing Emergency', 'customer': 'Customer #C0985', 'rating': 4.5, 'earned': '฿2,800', 'fee': '฿500', 'date': '2025-06-18'},
      {'id': 'PO-2505-0028', 'service': 'Electrical Inspection', 'customer': 'Customer #C0972', 'rating': 5.0, 'earned': '฿1,500', 'fee': '฿250', 'date': '2025-06-10'},
      {'id': 'PO-2505-0022', 'service': 'AC Repair', 'customer': 'Customer #C0960', 'rating': 4.0, 'earned': '฿900', 'fee': '฿250', 'date': '2025-06-05'},
      {'id': 'PO-2505-0015', 'service': 'Painting (3 rooms)', 'customer': 'Customer #C0945', 'rating': 5.0, 'earned': '฿6,500', 'fee': '฿750', 'date': '2025-05-28'},
    ];

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: history.length,
      itemBuilder: (_, i) {
        final h = history[i];
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
              Text(h['service'] as String, style: const TextStyle(fontSize: 14)),
              const SizedBox(height: 2),
              Text('${h['customer']}  •  ${h['date']}', style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
              const SizedBox(height: 8),
              Row(children: [
                Text('Earned: ${h['earned']}', style: const TextStyle(fontWeight: FontWeight.w600, color: AppTheme.primaryGreen)),
                const Spacer(),
                Text('${t('processing_fee')}: ${h['fee']}', style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
              ]),
            ]),
          ),
        );
      },
    );
  }
}
