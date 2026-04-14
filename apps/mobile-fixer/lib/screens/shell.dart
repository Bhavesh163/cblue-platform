import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/providers.dart';
import '../core/theme.dart';
import '../widgets/locale_switcher.dart';
import 'dashboard/overview_tab.dart';
import 'dashboard/active_jobs_tab.dart';
import 'dashboard/incoming_tab.dart';
import 'dashboard/properties_tab.dart';
import 'dashboard/history_tab.dart';
import 'dashboard/chat_tab.dart';
import 'dashboard/alerts_tab.dart';
import 'dashboard/profile_tab.dart';
import 'properties/property_list_screen.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _navIndex = 0;
  int _dashTab = 0;

  static const _dashTabs = [
    'overview', 'active_jobs', 'incoming', 'properties',
    'history', 'chat', 'alerts', 'profile',
  ];

  Widget _dashContent() {
    switch (_dashTab) {
      case 0: return const OverviewTab();
      case 1: return const ActiveJobsTab();
      case 2: return const IncomingTab();
      case 3: return const PropertiesTab();
      case 4: return const HistoryTab();
      case 5: return const ChatTab();
      case 6: return const AlertsTab();
      case 7: return const ProfileTab();
      default: return const OverviewTab();
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = context.watch<LocaleProvider>().t;

    final bodies = [
      // Dashboard with 8 tabs
      Column(children: [
        Container(
          color: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: List.generate(_dashTabs.length, (i) {
                final selected = _dashTab == i;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(t(_dashTabs[i]),
                        style: TextStyle(
                          fontSize: 13,
                          color: selected ? AppTheme.primaryBlue : AppTheme.textSecondary,
                          fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
                        )),
                    selected: selected,
                    onSelected: (_) => setState(() => _dashTab = i),
                  ),
                );
              }),
            ),
          ),
        ),
        const Divider(height: 1),
        Expanded(child: _dashContent()),
      ]),
      // My Properties (full CRUD)
      const PropertyListScreen(),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(_navIndex == 0 ? t('dashboard') : t('my_properties')),
        actions: const [LocaleSwitcher(), SizedBox(width: 8)],
      ),
      body: bodies[_navIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _navIndex,
        onDestinationSelected: (i) => setState(() => _navIndex = i),
        destinations: [
          NavigationDestination(icon: const Icon(Icons.dashboard), label: t('dashboard')),
          NavigationDestination(icon: const Icon(Icons.apartment), label: t('my_properties')),
        ],
      ),
    );
  }
}
