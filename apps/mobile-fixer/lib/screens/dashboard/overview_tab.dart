import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/providers.dart';
import '../../core/theme.dart';

class OverviewTab extends StatelessWidget {
  const OverviewTab({super.key});

  @override
  Widget build(BuildContext context) {
    final t = context.watch<LocaleProvider>().t;
    final auth = context.watch<AuthProvider>();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Welcome card
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [AppTheme.primaryGreen, Color(0xFF0D9488)]),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('${t('welcome_back')}, ${auth.displayName}!',
                style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text('${t('tier')}: ${auth.tier}', style: const TextStyle(color: Colors.white70, fontSize: 14)),
          ]),
        ),
        const SizedBox(height: 20),

        // Stats row
        Row(children: [
          _StatCard(label: t('total_earnings'), value: '฿45,200', icon: Icons.account_balance_wallet, color: AppTheme.primaryGreen),
          const SizedBox(width: 12),
          _StatCard(label: t('completed_jobs'), value: '28', icon: Icons.check_circle, color: AppTheme.primaryBlue),
        ]),
        const SizedBox(height: 12),
        Row(children: [
          _StatCard(label: t('rating'), value: '4.8 ⭐', icon: Icons.star, color: AppTheme.warningOrange),
          const SizedBox(width: 12),
          _StatCard(label: t('incoming'), value: '3', icon: Icons.notification_important, color: AppTheme.errorRed),
        ]),
        const SizedBox(height: 24),

        // Recent activity
        Text(t('recent_activity'), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        _ActivityTile(title: '${t('new_job_request')}: Plumbing repair', time: '10 min ago', icon: Icons.notifications_active, color: AppTheme.primaryBlue),
        _ActivityTile(title: '${t('payment_received')}: ฿1,500', time: '2 hours ago', icon: Icons.payment, color: AppTheme.primaryGreen),
        _ActivityTile(title: '${t('review_received')} ⭐⭐⭐⭐⭐', time: '1 day ago', icon: Icons.star, color: AppTheme.warningOrange),
        _ActivityTile(title: '${t('job_completed')}: PO-2506-0042', time: '2 days ago', icon: Icons.check_circle, color: AppTheme.primaryGreen),
      ]),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label, value;
  final IconData icon;
  final Color color;
  const _StatCard({required this.label, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
            const SizedBox(height: 4),
            Text(label, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
          ]),
        ),
      ),
    );
  }
}

class _ActivityTile extends StatelessWidget {
  final String title, time;
  final IconData icon;
  final Color color;
  const _ActivityTile({required this.title, required this.time, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(backgroundColor: color.withValues(alpha: 0.1), child: Icon(icon, color: color, size: 20)),
        title: Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
        subtitle: Text(time, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
      ),
    );
  }
}
