import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../core/providers.dart';

class PropertiesTab extends StatelessWidget {
  final bool standalone;
  const PropertiesTab({super.key, this.standalone = false});

  static final List<Map<String, dynamic>> _demoProperties = [
    {
      'title': {'en': 'Luxury Condo Sukhumvit', 'th': 'คอนโดหรูสุขุมวิท', 'zh': '素坤逸豪华公寓'},
      'price': '฿3,500,000',
      'type': 'SALE',
      'status': 'VIEWING_SCHEDULED',
      'lister': 'LST-0102',
      'viewDate': '2026-04-18',
      'tier': 'Luxury',
      'area': '45 sqm',
      'rooms': '1 bed / 1 bath',
    },
    {
      'title': {'en': 'House Ratchada for Rent', 'th': 'บ้านรัชดาให้เช่า', 'zh': '拉差达租房'},
      'price': '฿25,000/mo',
      'type': 'RENT',
      'status': 'CONTACTED',
      'lister': 'LST-0087',
      'viewDate': null,
      'tier': 'Standard',
      'area': '120 sqm',
      'rooms': '3 bed / 2 bath',
    },
    {
      'title': {'en': 'Land Chiang Mai', 'th': 'ที่ดินเชียงใหม่', 'zh': '清迈土地'},
      'price': '฿8,000,000',
      'type': 'SALE',
      'status': 'PENDING',
      'lister': 'LST-0201',
      'viewDate': null,
      'tier': 'Upper',
      'area': '200 sq.wah',
      'rooms': null,
    },
  ];

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _demoProperties.length + (standalone ? 1 : 0),
      itemBuilder: (context, i) {
        if (standalone && i == 0) {
          return _buildSearchBar(locale);
        }
        final propIdx = standalone ? i - 1 : i;
        final prop = _demoProperties[propIdx];
        final title = prop['title'] as Map<String, String>;

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Image placeholder
                Container(
                  height: 160,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: AppTheme.borderLight,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Center(child: Icon(Icons.apartment, size: 48, color: AppTheme.textMuted)),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        title[locale.locale] ?? title['en']!,
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
                      ),
                    ),
                    _SaleRentBadge(type: prop['type'], locale: locale),
                  ],
                ),
                const SizedBox(height: 4),
                Text(prop['price'], style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primaryBlue)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    if (prop['area'] != null) ...[
                      Icon(Icons.square_foot, size: 14, color: AppTheme.textSecondary),
                      const SizedBox(width: 4),
                      Text(prop['area'], style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                      const SizedBox(width: 16),
                    ],
                    if (prop['rooms'] != null) ...[
                      Icon(Icons.bed, size: 14, color: AppTheme.textSecondary),
                      const SizedBox(width: 4),
                      Text(prop['rooms'], style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                    ],
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryGreen.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(prop['tier'], style: const TextStyle(color: AppTheme.primaryGreen, fontSize: 11, fontWeight: FontWeight.w600)),
                    ),
                    const Spacer(),
                    if (prop['viewDate'] != null) ...[
                      Icon(Icons.event, size: 14, color: AppTheme.textMuted),
                      const SizedBox(width: 4),
                      Text(prop['viewDate'], style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                    ],
                  ],
                ),
                if (standalone) ...[
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () {},
                      child: Text(
                        locale.locale == 'th' ? 'ติดต่อผู้ลงประกาศ' : locale.locale == 'zh' ? '联系卖家' : 'Contact Lister',
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildSearchBar(LocaleProvider locale) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: TextFormField(
        decoration: InputDecoration(
          hintText: locale.t('search'),
          prefixIcon: const Icon(Icons.search),
          suffixIcon: IconButton(
            icon: const Icon(Icons.tune),
            onPressed: () {},
          ),
        ),
      ),
    );
  }
}

class _SaleRentBadge extends StatelessWidget {
  final String type;
  final LocaleProvider locale;

  const _SaleRentBadge({required this.type, required this.locale});

  @override
  Widget build(BuildContext context) {
    final isSale = type == 'SALE';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: (isSale ? AppTheme.primaryBlue : AppTheme.primaryGreen).withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        isSale ? locale.t('forSale') : locale.t('forRent'),
        style: TextStyle(
          color: isSale ? AppTheme.primaryBlue : AppTheme.primaryGreen,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
