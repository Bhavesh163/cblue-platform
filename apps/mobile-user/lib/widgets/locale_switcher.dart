import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/providers.dart';

class LocaleSwitcher extends StatelessWidget {
  const LocaleSwitcher({super.key});

  @override
  Widget build(BuildContext context) {
    final localeProv = context.watch<LocaleProvider>();

    return PopupMenuButton<String>(
      onSelected: (locale) => localeProv.setLocale(locale),
      itemBuilder: (context) => [
        PopupMenuItem(
          value: 'en',
          child: Row(
            children: [
              Text('🇺🇸', style: TextStyle(fontSize: 20)),
              const SizedBox(width: 8),
              const Text('English'),
              if (localeProv.locale == 'en') ...[
                const Spacer(),
                const Icon(Icons.check, size: 18, color: Colors.blue),
              ],
            ],
          ),
        ),
        PopupMenuItem(
          value: 'th',
          child: Row(
            children: [
              Text('🇹🇭', style: TextStyle(fontSize: 20)),
              const SizedBox(width: 8),
              const Text('ไทย'),
              if (localeProv.locale == 'th') ...[
                const Spacer(),
                const Icon(Icons.check, size: 18, color: Colors.blue),
              ],
            ],
          ),
        ),
        PopupMenuItem(
          value: 'zh',
          child: Row(
            children: [
              Text('🇨🇳', style: TextStyle(fontSize: 20)),
              const SizedBox(width: 8),
              const Text('中文'),
              if (localeProv.locale == 'zh') ...[
                const Spacer(),
                const Icon(Icons.check, size: 18, color: Colors.blue),
              ],
            ],
          ),
        ),
      ],
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              localeProv.locale == 'th' ? '🇹🇭' : localeProv.locale == 'zh' ? '🇨🇳' : '🇺🇸',
              style: const TextStyle(fontSize: 20),
            ),
            const SizedBox(width: 4),
            const Icon(Icons.arrow_drop_down, color: Colors.white, size: 20),
          ],
        ),
      ),
    );
  }
}
