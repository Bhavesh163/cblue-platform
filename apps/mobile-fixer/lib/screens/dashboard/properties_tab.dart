import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/providers.dart';
import '../../core/theme.dart';

class PropertiesTab extends StatelessWidget {
  const PropertiesTab({super.key});

  @override
  Widget build(BuildContext context) {
    final t = context.watch<LocaleProvider>().t;

    final props = [
      {'title': 'Modern Condo Sukhumvit', 'type': 'Condo', 'listing': 'RENT', 'price': '฿25,000/mo', 'area': '45 sqm', 'beds': 1, 'baths': 1, 'tier': 'Featured', 'status': 'active', 'views': 124},
      {'title': 'Townhouse Bangna', 'type': 'Townhouse', 'listing': 'SALE', 'price': '฿3.5M', 'area': '150 sqm', 'beds': 3, 'baths': 2, 'tier': 'Premium', 'status': 'active', 'views': 89},
      {'title': 'Land Plot Chiang Mai', 'type': 'Land', 'listing': 'SALE', 'price': '฿1.2M', 'area': '400 sqm', 'beds': 0, 'baths': 0, 'tier': 'Basic', 'status': 'inactive', 'views': 32},
    ];

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: props.length,
      itemBuilder: (_, i) {
        final p = props[i];
        final isRent = p['listing'] == 'RENT';
        final isActive = p['status'] == 'active';

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: isRent ? AppTheme.primaryBlue : AppTheme.primaryGreen,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(isRent ? t('for_rent') : t('for_sale'),
                      style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: isActive ? AppTheme.primaryGreen.withValues(alpha: 0.1) : AppTheme.textSecondary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(isActive ? t('active') : t('inactive'),
                      style: TextStyle(color: isActive ? AppTheme.primaryGreen : AppTheme.textSecondary, fontSize: 11, fontWeight: FontWeight.w600)),
                ),
                const Spacer(),
                Text('${p['tier']}', style: TextStyle(color: AppTheme.warningOrange, fontSize: 12, fontWeight: FontWeight.w600)),
              ]),
              const SizedBox(height: 10),
              Text(p['title'] as String, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text(p['type'] as String, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
              const SizedBox(height: 8),
              Row(children: [
                Text(p['price'] as String, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primaryBlue)),
                const Spacer(),
                Text('👁 ${p['views']} views', style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
              ]),
              const SizedBox(height: 8),
              Row(children: [
                _Detail(icon: Icons.square_foot, text: p['area'] as String),
                if ((p['beds'] as int) > 0) _Detail(icon: Icons.bed, text: '${p['beds']}'),
                if ((p['baths'] as int) > 0) _Detail(icon: Icons.bathtub, text: '${p['baths']}'),
              ]),
              const SizedBox(height: 12),
              Row(children: [
                OutlinedButton.icon(onPressed: () {}, icon: const Icon(Icons.edit, size: 16), label: Text(t('edit'))),
                const SizedBox(width: 8),
                OutlinedButton.icon(
                  onPressed: () {},
                  icon: Icon(isActive ? Icons.visibility_off : Icons.visibility, size: 16),
                  label: Text(isActive ? t('deactivate') : t('activate')),
                ),
              ]),
            ]),
          ),
        );
      },
    );
  }
}

class _Detail extends StatelessWidget {
  final IconData icon;
  final String text;
  const _Detail({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 16),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 16, color: AppTheme.textSecondary),
        const SizedBox(width: 4),
        Text(text, style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
      ]),
    );
  }
}
