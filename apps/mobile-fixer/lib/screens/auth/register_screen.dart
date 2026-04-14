import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../../core/providers.dart';
import '../../core/theme.dart';
import '../../core/constants.dart';
import '../../services/api_service.dart';
import 'ai_evaluation_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _company = TextEditingController();
  final _password = TextEditingController();
  final _confirmPw = TextEditingController();
  bool _pdpa = false;
  bool _loading = false;
  String? _error;
  String _category = 'household';
  final List<String> _selectedServices = [];
  File? _selfie;
  File? _idCard;
  final List<File> _portfolio = [];
  int _step = 0; // 0=form, 1=kyc, 2=portfolio, 3=submitting

  Future<void> _pickImage(String type) async {
    final picker = ImagePicker();
    final source = type == 'selfie' ? ImageSource.camera : ImageSource.gallery;
    final picked = await picker.pickImage(source: source, maxWidth: 1200, imageQuality: 85);
    if (picked != null) {
      setState(() {
        if (type == 'selfie') _selfie = File(picked.path);
        else if (type == 'id') _idCard = File(picked.path);
      });
    }
  }

  Future<void> _pickPortfolio() async {
    if (_portfolio.length >= 10) return;
    final picker = ImagePicker();
    final picked = await picker.pickMultiImage(maxWidth: 1200, imageQuality: 85);
    setState(() {
      for (final p in picked) {
        if (_portfolio.length < 10) _portfolio.add(File(p.path));
      }
    });
  }

  Future<void> _register() async {
    if (!_formKey.currentState!.validate() || !_pdpa) return;
    setState(() { _step = 3; _loading = true; _error = null; });
    try {
      final api = ApiService();

      // 1. Register user
      final res = await api.register({
        'name': _name.text.trim(),
        'email': _email.text.trim(),
        'phone': _phone.text.trim(),
        'company': _company.text.trim(),
        'password': _password.text,
        'category': _category,
        'services': _selectedServices,
        'pdpaConsent': true,
      });
      if (!mounted) return;
      final data = res.data;
      await context.read<AuthProvider>().login(data['user'], data['token']);
      await context.read<AuthProvider>().acceptPdpa();

      // 2. Upload KYC files (selfie + ID card)
      bool kycFailed = false;
      try {
        if (_selfie != null || _idCard != null) {
          await api.uploadKyc(selfie: _selfie, idCard: _idCard);
        }
      } catch (_) {
        kycFailed = true;
      }

      // 3. Upload portfolio images
      bool portfolioFailed = false;
      try {
        if (_portfolio.isNotEmpty) {
          await api.uploadPortfolio(_portfolio);
        }
      } catch (_) {
        portfolioFailed = true;
      }

      // 4. Navigate to AI evaluation screen
      if (mounted) {
        if (kycFailed) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(context.read<LocaleProvider>().t('kyc_upload_failed')), backgroundColor: Colors.orange, duration: const Duration(seconds: 4)),
          );
        }
        if (portfolioFailed) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(context.read<LocaleProvider>().t('portfolio_upload_failed')), backgroundColor: Colors.orange, duration: const Duration(seconds: 4)),
          );
        }
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => const AiEvaluationScreen()),
        );
      }
    } catch (e) {
      setState(() { _error = 'Registration failed. Please try again.'; _step = 0; });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = context.watch<LocaleProvider>().t;
    return Scaffold(
      appBar: AppBar(title: Text(t('register_as_partner'))),
      body: Stepper(
        currentStep: _step,
        onStepContinue: () {
          if (_step == 0 && _formKey.currentState!.validate() && _pdpa) {
            setState(() => _step = 1);
          } else if (_step == 1) {
            setState(() => _step = 2);
          } else if (_step == 2) {
            _register();
          }
        },
        onStepCancel: _step > 0 ? () => setState(() => _step--) : null,
        controlsBuilder: (context, details) {
          return Padding(
            padding: const EdgeInsets.only(top: 16),
            child: Row(children: [
              ElevatedButton(
                onPressed: _loading ? null : details.onStepContinue,
                child: _loading
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text(_step == 2 ? t('submit') : 'Next'),
              ),
              if (_step > 0) ...[
                const SizedBox(width: 12),
                TextButton(onPressed: details.onStepCancel, child: const Text('Back')),
              ],
            ]),
          );
        },
        steps: [
          // Step 0: Basic Info
          Step(
            title: Text(t('register')),
            isActive: _step >= 0,
            state: _step > 0 ? StepState.complete : StepState.indexed,
            content: Form(
              key: _formKey,
              child: Column(children: [
                if (_error != null)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(color: AppTheme.errorRed.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                    child: Text(_error!, style: const TextStyle(color: AppTheme.errorRed)),
                  ),
                TextFormField(controller: _name, decoration: InputDecoration(labelText: t('full_name')), validator: (v) => v != null && v.isNotEmpty ? null : 'Required'),
                const SizedBox(height: 12),
                TextFormField(controller: _email, decoration: InputDecoration(labelText: t('email')), keyboardType: TextInputType.emailAddress, validator: (v) => v != null && v.contains('@') ? null : 'Invalid email'),
                const SizedBox(height: 12),
                TextFormField(controller: _phone, decoration: InputDecoration(labelText: t('phone')), keyboardType: TextInputType.phone, validator: (v) => v != null && v.length >= 9 ? null : 'Invalid phone'),
                const SizedBox(height: 12),
                TextFormField(controller: _company, decoration: InputDecoration(labelText: t('company'))),
                const SizedBox(height: 12),
                // Category selection
                DropdownButtonFormField<String>(
                  initialValue: _category,
                  decoration: InputDecoration(labelText: t('service_category')),
                  items: ['household', 'project', 'professional', 'property_lister'].map((c) => DropdownMenuItem(value: c, child: Text(t(c)))).toList(),
                  onChanged: (v) => setState(() { _category = v!; _selectedServices.clear(); }),
                ),
                const SizedBox(height: 12),
                // Services multi-select
                if (_category != 'property_lister') ...[
                  Text(t('select_services'), style: const TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8, runSpacing: 4,
                    children: _servicesForCategory().map((s) => FilterChip(
                      label: Text(s, style: const TextStyle(fontSize: 12)),
                      selected: _selectedServices.contains(s),
                      onSelected: (sel) => setState(() => sel ? _selectedServices.add(s) : _selectedServices.remove(s)),
                    )).toList(),
                  ),
                  const SizedBox(height: 12),
                ],
                TextFormField(controller: _password, decoration: InputDecoration(labelText: t('password')), obscureText: true, validator: (v) => v != null && v.length >= 6 ? null : 'Min 6 chars'),
                const SizedBox(height: 12),
                TextFormField(controller: _confirmPw, decoration: InputDecoration(labelText: t('confirm_password')), obscureText: true, validator: (v) => v == _password.text ? null : 'Passwords must match'),
                const SizedBox(height: 12),
                CheckboxListTile(
                  value: _pdpa,
                  onChanged: (v) => setState(() => _pdpa = v!),
                  title: Text(t('pdpa_consent'), style: const TextStyle(fontSize: 13)),
                  controlAffinity: ListTileControlAffinity.leading,
                  contentPadding: EdgeInsets.zero,
                ),
              ]),
            ),
          ),
          // Step 1: KYC
          Step(
            title: Text(t('kyc_verification')),
            isActive: _step >= 1,
            state: _step > 1 ? StepState.complete : StepState.indexed,
            content: Column(children: [
              ListTile(
                leading: CircleAvatar(
                  backgroundImage: _selfie != null ? FileImage(_selfie!) : null,
                  child: _selfie == null ? const Icon(Icons.camera_alt) : null,
                ),
                title: Text(t('take_selfie')),
                subtitle: Text(_selfie != null ? 'Captured ✓' : 'Required'),
                trailing: ElevatedButton(onPressed: () => _pickImage('selfie'), child: const Text('Camera')),
              ),
              const Divider(),
              ListTile(
                leading: CircleAvatar(
                  backgroundImage: _idCard != null ? FileImage(_idCard!) : null,
                  child: _idCard == null ? const Icon(Icons.badge) : null,
                ),
                title: Text(t('upload_id')),
                subtitle: Text(_idCard != null ? 'Uploaded ✓' : 'Required'),
                trailing: ElevatedButton(onPressed: () => _pickImage('id'), child: const Text('Gallery')),
              ),
            ]),
          ),
          // Step 2: Portfolio
          Step(
            title: Text(t('portfolio')),
            isActive: _step >= 2,
            state: _step > 2 ? StepState.complete : StepState.indexed,
            content: Column(children: [
              Text(t('upload_portfolio'), style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              if (_portfolio.isNotEmpty)
                SizedBox(
                  height: 100,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: _portfolio.length,
                    itemBuilder: (_, i) => Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: Stack(children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.file(_portfolio[i], width: 100, height: 100, fit: BoxFit.cover),
                        ),
                        Positioned(
                          top: 2, right: 2,
                          child: GestureDetector(
                            onTap: () => setState(() => _portfolio.removeAt(i)),
                            child: Container(
                              decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                              child: const Icon(Icons.close, size: 18, color: Colors.white),
                            ),
                          ),
                        ),
                      ]),
                    ),
                  ),
                ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: _portfolio.length < 10 ? _pickPortfolio : null,
                icon: const Icon(Icons.add_photo_alternate),
                label: Text('${_portfolio.length}/10 images'),
              ),
              const SizedBox(height: 8),
              Text(t('pdpa_notice'), style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
            ]),
          ),
        ],
      ),
    );
  }

  List<String> _servicesForCategory() {
    switch (_category) {
      case 'household': return AppConstants.householdServices;
      case 'project': return AppConstants.projectServices;
      case 'professional': return AppConstants.professionalServices;
      default: return [];
    }
  }
}
