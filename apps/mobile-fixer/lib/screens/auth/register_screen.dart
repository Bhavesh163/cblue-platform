import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import 'dart:io';
import 'dart:ui' as ui;
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
  final List<String> _selectedServices = [];
  File? _selfie;
  File? _idCard;
  final List<File> _portfolio = [];
  int _step = 0; // 0=form, 1=kyc, 2=portfolio, 3=submitting
  String? _selfieStatus; // null=none, 'valid', 'rejected'
  String? _idCardStatus;
  String? _kycError;
  bool _kycValidating = false;

  /// Validate a KYC image: checks dimensions, file size, aspect ratio, and content heuristics
  Future<Map<String, dynamic>> _validateKycImage(File file, String type) async {
    // Capture t() before async gap to avoid build_context_synchronously warning
    final String Function(String) t = context.read<LocaleProvider>().t;
    final tFileTooSmall = t('kyc_file_too_small');
    final tFileTooLarge = t('kyc_file_too_large');
    final tTooSmall = t('kyc_too_small');
    final tTooLargeDims = t('kyc_too_large_dims');
    final tIdLandscape = t('kyc_id_landscape');
    final tIdNotCard = t('kyc_id_not_card');
    final tSelfieTooWide = t('kyc_selfie_too_wide');
    final tSelfieTooSmall = t('kyc_selfie_too_small');
    final tInvalidFormat = t('kyc_invalid_format');
    final tReadError = t('kyc_read_error');
    try {
      final bytes = await file.readAsBytes();
      // Check minimum file size (10KB - reject tiny/blank files)
      if (bytes.length < 10240) {
        return {'valid': false, 'reason': tFileTooSmall};
      }
      // Check max file size (20MB)
      if (bytes.length > 20 * 1024 * 1024) {
        return {'valid': false, 'reason': tFileTooLarge};
      }
      // Decode image to check dimensions
      final codec = await ui.instantiateImageCodec(bytes);
      final frame = await codec.getNextFrame();
      final w = frame.image.width;
      final h = frame.image.height;
      frame.image.dispose();
      // Minimum dimensions for readable ID
      if (w < 200 || h < 150) {
        return {'valid': false, 'reason': tTooSmall};
      }
      // Maximum dimension check (reject screenshots of unrelated content)
      if (w > 8000 || h > 8000) {
        return {'valid': false, 'reason': tTooLargeDims};
      }
      final aspect = w / h;

      if (type == 'id') {
        // Thai ID card is ~85.6mm × 53.98mm = aspect ~1.586
        // Accept landscape range 1.1-2.5 OR portrait if resolution is high
        if (aspect < 0.5) {
          return {'valid': false, 'reason': tIdLandscape};
        }
        // Extreme landscape (panorama/banner) is not an ID card
        if (aspect > 3.0) {
          return {'valid': false, 'reason': tIdNotCard};
        }
        // Perfectly square images are unlikely to be ID cards
        if (aspect > 0.95 && aspect < 1.05 && w < 500) {
          return {'valid': false, 'reason': tIdNotCard};
        }
      }

      if (type == 'selfie') {
        // Selfie should be portrait or square (face photo)
        if (aspect > 3.0) {
          return {'valid': false, 'reason': tSelfieTooWide};
        }
        // Very tiny selfies are suspicious
        if (w < 300 && h < 300) {
          return {'valid': false, 'reason': tSelfieTooSmall};
        }
      }

      // Check bytes for image header validity (JPEG SOI or PNG signature)
      if (bytes.length >= 4) {
        final isJpeg = bytes[0] == 0xFF && bytes[1] == 0xD8;
        final isPng = bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47;
        if (!isJpeg && !isPng) {
          return {'valid': false, 'reason': tInvalidFormat};
        }
      }

      return {'valid': true};
    } catch (_) {
      return {'valid': false, 'reason': tReadError};
    }
  }

  Future<void> _pickImage(String type) async {
    final picker = ImagePicker();
    final source = type == 'selfie' ? ImageSource.camera : ImageSource.gallery;
    final picked = await picker.pickImage(source: source, maxWidth: 1200, imageQuality: 85);
    if (picked != null) {
      final file = File(picked.path);
      setState(() { _kycValidating = true; _kycError = null; });
      final result = await _validateKycImage(file, type);
      if (!mounted) return;
      if (result['valid'] == true) {
        setState(() {
          if (type == 'selfie') { _selfie = file; _selfieStatus = 'valid'; }
          else if (type == 'id') { _idCard = file; _idCardStatus = 'valid'; }
          _kycValidating = false;
        });
      } else {
        setState(() {
          if (type == 'selfie') { _selfie = null; _selfieStatus = 'rejected'; }
          else if (type == 'id') { _idCard = null; _idCardStatus = 'rejected'; }
          _kycError = result['reason'] as String?;
          _kycValidating = false;
        });
      }
    }
  }

  static const _imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
  bool _isImage(File f) => _imageExts.any((ext) => f.path.toLowerCase().endsWith('.$ext'));

  Future<void> _pickPortfolio() async {
    if (_portfolio.length >= 10) return;
    final result = await FilePicker.platform.pickFiles(
      allowMultiple: true,
      type: FileType.custom,
      allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx'],
    );
    if (result != null) {
      setState(() {
        for (final file in result.files) {
          if (_portfolio.length < 10 && file.path != null) {
            _portfolio.add(File(file.path!));
          }
        }
      });
    }
  }

  Future<void> _register() async {
    if (!_formKey.currentState!.validate() || !_pdpa) return;
    setState(() { _step = 3; _loading = true; _error = null; });
    try {
      final api = ApiService();

      // 1. Register subscriber + fixer profile (2-step flow)
      final data = await api.register({
        'name': _name.text.trim(),
        'email': _email.text.trim(),
        'phone': _phone.text.trim(),
        'company': _company.text.trim(),
        'password': _password.text,
        'services': _selectedServices,
        'pdpaConsent': true,
      });
      if (!mounted) return;
      await context.read<AuthProvider>().login(data['user'], data['token']);
      await context.read<AuthProvider>().acceptPdpa();

      // Show warning if fixer profile creation failed
      if (data['fixerProfileError'] != null && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.read<LocaleProvider>().t('registration_error')), backgroundColor: Colors.orange, duration: const Duration(seconds: 4)),
        );
      }

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
      setState(() { _error = context.read<LocaleProvider>().t('registration_error'); _step = 0; });
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
                    : Text(_step == 2 ? t('submit') : t('next')),
              ),
              if (_step > 0) ...[
                const SizedBox(width: 12),
                TextButton(onPressed: details.onStepCancel, child: Text(t('back'))),
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
                TextFormField(controller: _name, decoration: InputDecoration(labelText: t('full_name')), validator: (v) => v != null && v.isNotEmpty ? null : t('required_field')),
                const SizedBox(height: 12),
                TextFormField(controller: _email, decoration: InputDecoration(labelText: t('email')), keyboardType: TextInputType.emailAddress, validator: (v) => v != null && RegExp(r'\S+@\S+\.\S+').hasMatch(v) ? null : t('invalid_email')),
                const SizedBox(height: 12),
                TextFormField(controller: _phone, decoration: InputDecoration(labelText: t('phone')), keyboardType: TextInputType.phone, validator: (v) => v != null && v.length >= 9 ? null : t('invalid_phone')),
                const SizedBox(height: 12),
                TextFormField(controller: _company, decoration: InputDecoration(labelText: t('company'))),
                const SizedBox(height: 12),
                // Services multi-select (categorized: household, project, professional)
                Text(t('select_services'), style: const TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                Builder(builder: (ctx) {
                  final locale = ctx.watch<LocaleProvider>().locale;

                  Widget buildCategory(String icon, String titleEn, String titleTh, String titleZh, Map<String, List<String>> services, Color color) {
                    final enList = services['en']!;
                    final localeList = services[locale] ?? enList;
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 8),
                        Text(
                          '$icon ${locale == 'th' ? titleTh : locale == 'zh' ? titleZh : titleEn}',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: color),
                        ),
                        const SizedBox(height: 4),
                        Wrap(
                          spacing: 8, runSpacing: 4,
                          children: enList.asMap().entries.map((e) {
                            final label = e.key < localeList.length ? localeList[e.key] : e.value;
                            return FilterChip(
                              label: Text(label, style: const TextStyle(fontSize: 12)),
                              selected: _selectedServices.contains(e.value),
                              selectedColor: color.withValues(alpha: 0.2),
                              onSelected: (sel) => setState(() => sel ? _selectedServices.add(e.value) : _selectedServices.remove(e.value)),
                            );
                          }).toList(),
                        ),
                      ],
                    );
                  }

                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      buildCategory('🏠', 'Household Maintenance', 'งานซ่อมบำรุงบ้าน', '家庭维修', AppConstants.householdServices, Colors.blue.shade700),
                      buildCategory('🏗️', 'Project Work', 'งานโครงการ', '项目工程', AppConstants.projectServices, Colors.green.shade700),
                      buildCategory('👔', 'Book Professionals', 'มืออาชีพ', '专业人士', AppConstants.professionalServices, Colors.purple.shade700),
                    ],
                  );
                }),
                const SizedBox(height: 12),
                TextFormField(controller: _password, decoration: InputDecoration(labelText: t('password')), obscureText: true, validator: (v) => v != null && v.length >= 8 ? null : t('min_8_chars')),
                const SizedBox(height: 12),
                TextFormField(controller: _confirmPw, decoration: InputDecoration(labelText: t('confirm_password')), obscureText: true, validator: (v) => v == _password.text ? null : t('passwords_mismatch')),
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
              // AI Notice
              Container(
                padding: const EdgeInsets.all(10),
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.blue.shade200)),
                child: Row(children: [
                  Icon(Icons.smart_toy, color: Colors.blue.shade700, size: 20),
                  const SizedBox(width: 8),
                  Expanded(child: Text(t('kyc_ai_notice'), style: TextStyle(fontSize: 12, color: Colors.blue.shade800))),
                ]),
              ),
              if (_kycError != null)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(10),
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(color: AppTheme.errorRed.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                  child: Row(children: [
                    const Icon(Icons.warning_amber, color: AppTheme.errorRed, size: 18),
                    const SizedBox(width: 8),
                    Expanded(child: Text(_kycError!, style: const TextStyle(color: AppTheme.errorRed, fontSize: 12))),
                  ]),
                ),
              if (_kycValidating)
                const Padding(
                  padding: EdgeInsets.only(bottom: 12),
                  child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                    SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                    SizedBox(width: 8),
                    Text('AI validating photo...', style: TextStyle(fontSize: 12)),
                  ]),
                ),
              ListTile(
                leading: Container(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: _selfieStatus == 'valid' ? Colors.green : _selfieStatus == 'rejected' ? AppTheme.errorRed : Colors.grey,
                      width: _selfieStatus != null ? 2.5 : 1,
                    ),
                  ),
                  child: CircleAvatar(
                    backgroundImage: _selfie != null ? FileImage(_selfie!) : null,
                    child: _selfie == null
                        ? const Icon(Icons.camera_alt)
                        : _selfieStatus == 'valid'
                            ? const Icon(Icons.check_circle, color: Colors.green, size: 20)
                            : null,
                  ),
                ),
                title: Text(t('take_selfie')),
                subtitle: Text(
                  _selfieStatus == 'valid' ? '✓ ${t('captured')}' : _selfieStatus == 'rejected' ? '✗ ${t('rejected')}' : t('required_field'),
                  style: TextStyle(color: _selfieStatus == 'valid' ? Colors.green : _selfieStatus == 'rejected' ? AppTheme.errorRed : null),
                ),
                trailing: ElevatedButton(onPressed: _kycValidating ? null : () => _pickImage('selfie'), child: Text(t('camera'))),
              ),
              const Divider(),
              ListTile(
                leading: Container(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: _idCardStatus == 'valid' ? Colors.green : _idCardStatus == 'rejected' ? AppTheme.errorRed : Colors.grey,
                      width: _idCardStatus != null ? 2.5 : 1,
                    ),
                  ),
                  child: CircleAvatar(
                    backgroundImage: _idCard != null ? FileImage(_idCard!) : null,
                    child: _idCard == null
                        ? const Icon(Icons.badge)
                        : _idCardStatus == 'valid'
                            ? const Icon(Icons.check_circle, color: Colors.green, size: 20)
                            : null,
                  ),
                ),
                title: Text(t('upload_id')),
                subtitle: Text(
                  _idCardStatus == 'valid' ? '✓ ${t('uploaded')}' : _idCardStatus == 'rejected' ? '✗ ${t('rejected')}' : t('required_field'),
                  style: TextStyle(color: _idCardStatus == 'valid' ? Colors.green : _idCardStatus == 'rejected' ? AppTheme.errorRed : null),
                ),
                trailing: ElevatedButton(onPressed: _kycValidating ? null : () => _pickImage('id'), child: Text(t('gallery'))),
              ),
              const SizedBox(height: 8),
              Text('📋 1. Selfie → 2. ID Card Front/Back', style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
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
                          child: _isImage(_portfolio[i])
                              ? Image.file(_portfolio[i], width: 100, height: 100, fit: BoxFit.cover)
                              : Container(
                                  width: 100, height: 100,
                                  decoration: BoxDecoration(color: Colors.grey.shade200, borderRadius: BorderRadius.circular(8)),
                                  child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                                    Icon(_portfolio[i].path.endsWith('.pdf') ? Icons.picture_as_pdf : Icons.description, size: 36, color: AppTheme.primaryBlue),
                                    const SizedBox(height: 4),
                                    Text(_portfolio[i].path.split('/').last, style: const TextStyle(fontSize: 9), maxLines: 2, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center),
                                  ]),
                                ),
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
                label: Text('${_portfolio.length}/10 ${t('files_count')}'),
              ),
              const SizedBox(height: 8),
              Text(t('pdpa_notice'), style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
            ]),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    _company.dispose();
    _password.dispose();
    _confirmPw.dispose();
    super.dispose();
  }
}
