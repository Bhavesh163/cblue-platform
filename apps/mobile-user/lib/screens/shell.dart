import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/providers.dart';
import 'dashboard/overview_tab.dart';
import 'dashboard/active_jobs_tab.dart';
import 'dashboard/requests_tab.dart';
import 'dashboard/properties_tab.dart';
import 'dashboard/history_tab.dart';
import 'dashboard/chat_tab.dart';
import 'dashboard/alerts_tab.dart';
import 'dashboard/profile_tab.dart';
import 'booking/booking_screen.dart';
import '../widgets/locale_switcher.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _navIndex = 0;
  int _dashTab = 0;

  final List<Map<String, String>> _dashTabs = const [
    {'icon': '📊', 'key': 'overview'},
    {'icon': '🔧', 'key': 'activeJobs'},
    {'icon': '📋', 'key': 'requests'},
    {'icon': '🏢', 'key': 'properties'},
    {'icon': '📜', 'key': 'history'},
    {'icon': '💬', 'key': 'chat'},
    {'icon': '🔔', 'key': 'alerts'},
    {'icon': '👤', 'key': 'profile'},
  ];

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    context.watch<AuthProvider>();

    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Image.asset('assets/images/logo.jpg', height: 28),
            const SizedBox(width: 8),
            Text(
              locale.t('customerPage'),
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w400),
            ),
          ],
        ),
        actions: const [LocaleSwitcher()],
      ),
      body: _buildBody(),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _navIndex,
        onTap: (i) => setState(() => _navIndex = i),
        items: [
          BottomNavigationBarItem(
            icon: const Icon(Icons.dashboard),
            label: locale.t('dashboard'),
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.handyman),
            label: locale.t('bookFixers'),
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.apartment),
            label: locale.t('realEstate'),
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.chat_bubble_outline),
            label: locale.t('chat'),
          ),
        ],
      ),
    );
  }

  Widget _buildBody() {
    switch (_navIndex) {
      case 0:
        return _buildDashboard();
      case 1:
        return const BookingScreen();
      case 2:
        return const PropertiesTab(standalone: true);
      case 3:
        return const ChatTab(standalone: true);
      default:
        return _buildDashboard();
    }
  }

  Widget _buildDashboard() {
    final locale = context.watch<LocaleProvider>();

    return Column(
      children: [
        // Tab pills
        SizedBox(
          height: 48,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            itemCount: _dashTabs.length,
            itemBuilder: (context, i) {
              final tab = _dashTabs[i];
              final selected = _dashTab == i;
              return Padding(
                padding: const EdgeInsets.only(right: 6),
                child: ChoiceChip(
                  label: Text('${tab['icon']} ${locale.t(tab['key']!)}'),
                  selected: selected,
                  onSelected: (_) => setState(() => _dashTab = i),
                  selectedColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.15),
                  labelStyle: TextStyle(
                    color: selected ? Theme.of(context).colorScheme.primary : null,
                    fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                    fontSize: 13,
                  ),
                ),
              );
            },
          ),
        ),
        const Divider(height: 1),
        // Tab content
        Expanded(child: _buildTabContent()),
      ],
    );
  }

  Widget _buildTabContent() {
    switch (_dashTab) {
      case 0:
        return const OverviewTab();
      case 1:
        return const ActiveJobsTab();
      case 2:
        return const RequestsTab();
      case 3:
        return const PropertiesTab();
      case 4:
        return const HistoryTab();
      case 5:
        return const ChatTab();
      case 6:
        return const AlertsTab();
      case 7:
        return const ProfileTab();
      default:
        return const OverviewTab();
    }
  }
}
