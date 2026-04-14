import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/providers.dart';
import '../../core/theme.dart';
import '../../services/api_service.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _email = TextEditingController();
  bool _loading = false;
  bool _sent = false;

  Future<void> _send() async {
    if (_email.text.trim().isEmpty) return;
    setState(() => _loading = true);
    try {
      await ApiService().forgotPassword(_email.text.trim());
      setState(() => _sent = true);
    } catch (_) {
      setState(() => _sent = true); // don't reveal if email exists
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = context.watch<LocaleProvider>().t;
    return Scaffold(
      appBar: AppBar(title: Text(t('forgot_password'))),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: _sent
            ? Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                const Icon(Icons.mark_email_read, size: 64, color: AppTheme.primaryGreen),
                const SizedBox(height: 16),
                Text(t('reset_sent'), style: const TextStyle(fontSize: 18), textAlign: TextAlign.center),
                const SizedBox(height: 24),
                ElevatedButton(onPressed: () => Navigator.pop(context), child: Text(t('login'))),
              ])
            : Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                const Icon(Icons.lock_reset, size: 64, color: AppTheme.primaryBlue),
                const SizedBox(height: 24),
                TextFormField(
                  controller: _email,
                  decoration: InputDecoration(labelText: t('email'), prefixIcon: const Icon(Icons.email)),
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _loading ? null : _send,
                    child: _loading
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : Text(t('send_reset_link')),
                  ),
                ),
              ]),
      ),
    );
  }
}
