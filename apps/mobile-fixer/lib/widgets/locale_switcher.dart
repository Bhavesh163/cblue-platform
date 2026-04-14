import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/providers.dart';

class LocaleSwitcher extends StatelessWidget {
  const LocaleSwitcher({super.key});

  @override
  Widget build(BuildContext context) {
    final lp = context.watch<LocaleProvider>();
    return PopupMenuButton<String>(
      icon: const Icon(Icons.language, color: Colors.white),
      onSelected: (v) => lp.setLocale(v),
      itemBuilder: (_) => [
        _item('en', '🇺🇸 English', lp.locale),
        _item('th', '🇹🇭 ไทย', lp.locale),
        _item('zh', '🇨🇳 中文', lp.locale),
      ],
    );
  }

  PopupMenuItem<String> _item(String code, String label, String current) {
    return PopupMenuItem(
      value: code,
      child: Row(children: [
        Text(label),
        if (code == current) ...[const Spacer(), const Icon(Icons.check, size: 18)],
      ]),
    );
  }
}
