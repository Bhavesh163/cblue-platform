import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../core/providers.dart';

class ProfileTab extends StatelessWidget {
  const ProfileTab({super.key});

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final auth = context.watch<AuthProvider>();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Avatar & name
          CircleAvatar(
            radius: 48,
            backgroundColor: AppTheme.primaryBlue.withValues(alpha: 0.1),
            child: Text(
              auth.displayName.isNotEmpty ? auth.displayName[0].toUpperCase() : '?',
              style: const TextStyle(fontSize: 36, fontWeight: FontWeight.bold, color: AppTheme.primaryBlue),
            ),
          ),
          const SizedBox(height: 12),
          Text(auth.displayName, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          Text(auth.email, style: const TextStyle(color: AppTheme.textSecondary)),
          const SizedBox(height: 24),

          // Stats
          Row(
            children: [
              _StatItem(
                label: locale.t('total_jobs'),
                value: '17',
              ),
              _StatItem(
                label: locale.t('avg_rating'),
                value: '4.8 ⭐',
              ),
              _StatItem(
                label: locale.t('member_since'),
                value: '2026',
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Settings
          _SettingsSection(
            title: locale.t('settings'),
            items: [
              _SettingsItem(
                icon: Icons.person_outlined,
                title: locale.t('edit_profile'),
                onTap: () {
                  final nameCtrl = TextEditingController(text: auth.displayName);
                  showDialog(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      title: Text(locale.t('edit_profile')),
                      content: TextField(controller: nameCtrl, decoration: InputDecoration(labelText: locale.t('name'))),
                      actions: [
                        TextButton(onPressed: () => Navigator.pop(ctx), child: Text(locale.t('cancel'))),
                        ElevatedButton(
                          onPressed: () {
                            Navigator.pop(ctx);
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(locale.t('profile_updated')), backgroundColor: AppTheme.success));
                          },
                          child: Text(locale.t('save')),
                        ),
                      ],
                    ),
                  );
                },
              ),
              _SettingsItem(
                icon: Icons.lock_outlined,
                title: locale.t('change_password'),
                onTap: () {
                  final currentPw = TextEditingController();
                  final newPw = TextEditingController();
                  showDialog(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      title: Text(locale.t('change_password')),
                      content: Column(mainAxisSize: MainAxisSize.min, children: [
                        TextField(controller: currentPw, decoration: InputDecoration(labelText: locale.t('password')), obscureText: true),
                        const SizedBox(height: 12),
                        TextField(controller: newPw, decoration: InputDecoration(labelText: locale.t('new_password')), obscureText: true),
                      ]),
                      actions: [
                        TextButton(onPressed: () => Navigator.pop(ctx), child: Text(locale.t('cancel'))),
                        ElevatedButton(
                          onPressed: () {
                            Navigator.pop(ctx);
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(locale.t('password_changed')), backgroundColor: AppTheme.success));
                          },
                          child: Text(locale.t('save')),
                        ),
                      ],
                    ),
                  );
                },
              ),
              _SettingsItem(
                icon: Icons.notifications_outlined,
                title: locale.t('notifications'),
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(locale.t('notifications_enabled')), backgroundColor: AppTheme.primaryBlue));
                },
              ),
              _SettingsItem(
                icon: Icons.privacy_tip_outlined,
                title: 'PDPA',
                subtitle: auth.pdpaConsent
                    ? locale.t('pdpa_consented')
                    : null,
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                    content: Text(locale.t('pdpa_data_retained')),
                    backgroundColor: AppTheme.primaryBlue,
                  ));
                },
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Logout
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () async {
                final confirmed = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: Text(locale.t('logout')),
                    content: Text(
                      locale.t('logout_confirm'),
                    ),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(locale.t('cancel'))),
                      ElevatedButton(
                        onPressed: () => Navigator.pop(ctx, true),
                        style: ElevatedButton.styleFrom(backgroundColor: AppTheme.error),
                        child: Text(locale.t('logout')),
                      ),
                    ],
                  ),
                );
                if (confirmed == true && context.mounted) {
                  await context.read<AuthProvider>().logout();
                }
              },
              icon: const Icon(Icons.logout, color: AppTheme.error),
              label: Text(locale.t('logout'), style: const TextStyle(color: AppTheme.error)),
              style: OutlinedButton.styleFrom(side: const BorderSide(color: AppTheme.error)),
            ),
          ),
          const SizedBox(height: 24),

          // PDPA notice
          Text(
            locale.t('pdpa_data_retained'),
            style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final String label;
  final String value;

  const _StatItem({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primaryBlue)),
          const SizedBox(height: 4),
          Text(label, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary), textAlign: TextAlign.center),
        ],
      ),
    );
  }
}

class _SettingsSection extends StatelessWidget {
  final String title;
  final List<_SettingsItem> items;

  const _SettingsSection({required this.title, required this.items});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.borderLight),
          ),
          child: Column(children: items),
        ),
      ],
    );
  }
}

class _SettingsItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback onTap;

  const _SettingsItem({required this.icon, required this.title, this.subtitle, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: AppTheme.textSecondary),
      title: Text(title, style: const TextStyle(fontSize: 14)),
      subtitle: subtitle != null ? Text(subtitle!, style: const TextStyle(fontSize: 12, color: AppTheme.success)) : null,
      trailing: const Icon(Icons.chevron_right, size: 20, color: AppTheme.textMuted),
      onTap: onTap,
    );
  }
}
