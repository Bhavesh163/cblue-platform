import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/providers.dart';
import '../../core/theme.dart';

class ProfileTab extends StatelessWidget {
  const ProfileTab({super.key});

  @override
  Widget build(BuildContext context) {
    final t = context.watch<LocaleProvider>().t;
    final auth = context.watch<AuthProvider>();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(children: [
        // Avatar & name
        CircleAvatar(radius: 44, backgroundColor: AppTheme.primaryGreen.withValues(alpha: 0.2),
            child: Text(auth.displayName.isNotEmpty ? auth.displayName[0].toUpperCase() : 'P', style: const TextStyle(fontSize: 36, fontWeight: FontWeight.bold, color: AppTheme.primaryGreen))),
        const SizedBox(height: 12),
        Text(auth.displayName, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
        Text(auth.email, style: const TextStyle(color: AppTheme.textSecondary)),
        const SizedBox(height: 4),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(color: AppTheme.warningOrange.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
          child: Text('${t('tier')}: ${auth.tier}', style: const TextStyle(color: AppTheme.warningOrange, fontWeight: FontWeight.w600, fontSize: 13)),
        ),
        const SizedBox(height: 20),

        // Stats row
        Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
          _Stat(label: t('completed_jobs'), value: '28'),
          _Stat(label: t('rating'), value: '4.8'),
          _Stat(label: t('total_earnings'), value: '฿45K'),
        ]),
        const SizedBox(height: 24),

        // Skills section
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(t('skills'), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 8),
              Wrap(spacing: 8, runSpacing: 6, children: [
                'Plumbing', 'Electrical', 'AC Installation', 'General Maintenance',
              ].map((s) {
                final locale = context.watch<LocaleProvider>().locale;
                final Map<String, String> skillNames = {
                  'Plumbing': locale == 'th' ? 'ประปา' : locale == 'zh' ? '水管' : 'Plumbing',
                  'Electrical': locale == 'th' ? 'ไฟฟ้า' : locale == 'zh' ? '电气' : 'Electrical',
                  'AC Installation': locale == 'th' ? 'ติดตั้งแอร์' : locale == 'zh' ? '空调安装' : 'AC Installation',
                  'General Maintenance': locale == 'th' ? 'ซ่อมบำรุงทั่วไป' : locale == 'zh' ? '一般维修' : 'General Maintenance',
                };
                return Chip(label: Text(skillNames[s] ?? s, style: const TextStyle(fontSize: 12)), backgroundColor: AppTheme.primaryBlue.withValues(alpha: 0.1));
              }).toList()),
            ]),
          ),
        ),
        const SizedBox(height: 12),

        // Settings
        Card(
          child: Column(children: [
            _SettingsTile(icon: Icons.person_outline, label: t('edit_profile'), onTap: () => _showEditProfile(context, t, auth)),
            _SettingsTile(icon: Icons.lock_outline, label: t('change_password'), onTap: () => _showChangePassword(context, t)),
            _SettingsTile(icon: Icons.notifications_outlined, label: t('alerts'), onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(t('alerts')), backgroundColor: AppTheme.primaryBlue));
            }),
            _SettingsTile(icon: Icons.camera_alt_outlined, label: t('kyc_verification'), onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(t('kyc_up_to_date')), backgroundColor: AppTheme.primaryGreen));
            }),
            _SettingsTile(icon: Icons.photo_library_outlined, label: t('portfolio'), onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(t('portfolio_ok')), backgroundColor: AppTheme.primaryGreen));
            }),
            _SettingsTile(icon: Icons.shield_outlined, label: 'PDPA', onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(t('pdpa_notice')), backgroundColor: AppTheme.primaryBlue));
            }),
          ]),
        ),
        const SizedBox(height: 12),

        // Logout
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: () => _confirmLogout(context, t),
            icon: const Icon(Icons.logout, color: AppTheme.errorRed),
            label: Text(t('logout'), style: const TextStyle(color: AppTheme.errorRed)),
            style: OutlinedButton.styleFrom(side: const BorderSide(color: AppTheme.errorRed)),
          ),
        ),
        const SizedBox(height: 12),
        Text(t('pdpa_notice'), style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary), textAlign: TextAlign.center),
      ]),
    );
  }

  void _confirmLogout(BuildContext context, String Function(String) t) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(t('logout')),
        content: Text(t('logout_confirm')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: Text(t('cancel'))),
          ElevatedButton(
            onPressed: () {
              context.read<AuthProvider>().logout();
              Navigator.pop(context);
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.errorRed),
            child: Text(t('confirm')),
          ),
        ],
      ),
    );
  }

  void _showEditProfile(BuildContext context, String Function(String) t, AuthProvider auth) {
    final nameCtrl = TextEditingController(text: auth.displayName);
    final phoneCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(t('edit_profile')),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: nameCtrl, decoration: InputDecoration(labelText: t('full_name'))),
          const SizedBox(height: 12),
          TextField(controller: phoneCtrl, decoration: InputDecoration(labelText: t('phone')), keyboardType: TextInputType.phone),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: Text(t('cancel'))),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${t('profile')} updated ✓'), backgroundColor: AppTheme.primaryGreen));
            },
            child: Text(t('save')),
          ),
        ],
      ),
    );
  }

  void _showChangePassword(BuildContext context, String Function(String) t) {
    final currentPw = TextEditingController();
    final newPw = TextEditingController();
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(t('change_password')),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: currentPw, decoration: InputDecoration(labelText: t('current_password')), obscureText: true),
          const SizedBox(height: 12),
          TextField(controller: newPw, decoration: InputDecoration(labelText: t('new_password')), obscureText: true),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: Text(t('cancel'))),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${t('password')} updated ✓'), backgroundColor: AppTheme.primaryGreen));
            },
            child: Text(t('save')),
          ),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  final String label, value;
  const _Stat({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.primaryBlue)),
      Text(label, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
    ]);
  }
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _SettingsTile({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: AppTheme.primaryBlue),
      title: Text(label, style: const TextStyle(fontSize: 15)),
      trailing: const Icon(Icons.chevron_right, color: AppTheme.textSecondary),
      onTap: onTap,
    );
  }
}
