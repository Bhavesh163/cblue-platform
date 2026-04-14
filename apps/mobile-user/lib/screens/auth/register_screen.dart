import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../core/providers.dart';
import '../../services/api_service.dart';
import '../../widgets/locale_switcher.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _companyCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _loading = false;
  bool _pdpaChecked = false;
  String? _error;

  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) return;
    final t = context.read<LocaleProvider>().t;
    if (!_pdpaChecked) {
      setState(() => _error = t('pdpa_required'));
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      final res = await ApiService.register(
        name: _nameCtrl.text.trim(),
        email: _emailCtrl.text.trim(),
        password: _passwordCtrl.text,
        phone: _phoneCtrl.text.trim().isEmpty ? null : _phoneCtrl.text.trim(),
        company: _companyCtrl.text.trim().isEmpty ? null : _companyCtrl.text.trim(),
      );
      if (!mounted) return;
      final auth = context.read<AuthProvider>();
      await auth.login(res['subscriber'] ?? res, res['token'] ?? '');
      await auth.acceptPdpa();
      if (mounted) Navigator.of(context).popUntil((route) => route.isFirst);
    } catch (e) {
      setState(() => _error = e.toString().contains('409')
          ? t('email_exists')
          : t('registration_error'));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();

    return Scaffold(
      appBar: AppBar(
        title: Text(locale.t('register')),
        actions: const [LocaleSwitcher()],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_error != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: AppTheme.error.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(_error!, style: const TextStyle(color: AppTheme.error)),
                ),
              TextFormField(
                controller: _nameCtrl,
                decoration: InputDecoration(
                  labelText: '${locale.t('name')} *',
                  prefixIcon: const Icon(Icons.person_outlined),
                ),
                validator: (v) => v == null || v.isEmpty ? locale.t('required_field') : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                decoration: InputDecoration(
                  labelText: '${locale.t('email')} *',
                  prefixIcon: const Icon(Icons.email_outlined),
                ),
                validator: (v) {
                  if (v == null || v.isEmpty) return locale.t('required_field');
                  if (!RegExp(r'\S+@\S+\.\S+').hasMatch(v)) return locale.t('invalid_email');
                  return null;
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _phoneCtrl,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(
                  labelText: locale.t('phone'),
                  prefixIcon: const Icon(Icons.phone_outlined),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _companyCtrl,
                decoration: InputDecoration(
                  labelText: locale.t('company'),
                  prefixIcon: const Icon(Icons.business_outlined),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _passwordCtrl,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: '${locale.t('password')} *',
                  prefixIcon: const Icon(Icons.lock_outlined),
                ),
                validator: (v) {
                  if (v == null || v.length < 8) return locale.t('passwordMin8');
                  return null;
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _confirmCtrl,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: '${locale.t('confirmPassword')} *',
                  prefixIcon: const Icon(Icons.lock_outlined),
                ),
                validator: (v) {
                  if (v != _passwordCtrl.text) return locale.t('passwords_mismatch');
                  return null;
                },
              ),
              const SizedBox(height: 16),
              CheckboxListTile(
                value: _pdpaChecked,
                onChanged: (v) => setState(() => _pdpaChecked = v ?? false),
                title: Text(locale.t('pdpaConsent'), style: const TextStyle(fontSize: 13)),
                controlAffinity: ListTileControlAffinity.leading,
                contentPadding: EdgeInsets.zero,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _loading ? null : _register,
                child: _loading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text(locale.t('register')),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _companyCtrl.dispose();
    _passwordCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }
}
