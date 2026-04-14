import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/theme.dart';
import '../../core/constants.dart';
import '../../core/providers.dart';
import 'fixer_results_screen.dart';

class BookingScreen extends StatefulWidget {
  const BookingScreen({super.key});

  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();

    return Column(
      children: [
        Container(
          color: Colors.white,
          child: TabBar(
            controller: _tabCtrl,
            labelColor: AppTheme.primaryBlue,
            unselectedLabelColor: AppTheme.textSecondary,
            indicatorColor: AppTheme.primaryBlue,
            tabs: [
              Tab(text: '🏠 ${locale.locale == 'th' ? 'บ้าน' : locale.locale == 'zh' ? '家庭' : 'Household'}'),
              Tab(text: '🏗️ ${locale.locale == 'th' ? 'โปรเจกต์' : locale.locale == 'zh' ? '项目' : 'Project'}'),
              Tab(text: '👔 ${locale.locale == 'th' ? 'มืออาชีพ' : locale.locale == 'zh' ? '专业' : 'Professional'}'),
            ],
          ),
        ),
        Expanded(
          child: TabBarView(
            controller: _tabCtrl,
            children: const [
              _BookingForm(type: 'household'),
              _BookingForm(type: 'project'),
              _BookingForm(type: 'professional'),
            ],
          ),
        ),
      ],
    );
  }
}

class _BookingForm extends StatefulWidget {
  final String type;
  const _BookingForm({required this.type});

  @override
  State<_BookingForm> createState() => _BookingFormState();
}

class _BookingFormState extends State<_BookingForm> with AutomaticKeepAliveClientMixin {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _companyCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _postalCtrl = TextEditingController();
  String? _selectedService;
  DateTime? _startDate;
  List<XFile> _images = [];
  bool _loading = false;

  @override
  bool get wantKeepAlive => true;

  List<Map<String, String>> get _services {
    switch (widget.type) {
      case 'household':
        return AppConstants.householdServices;
      case 'project':
        return AppConstants.projectServices;
      case 'professional':
        return AppConstants.professionalServices;
      default:
        return [];
    }
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthProvider>();
      if (auth.isLoggedIn) {
        _nameCtrl.text = auth.subscriber?['name'] ?? '';
        _emailCtrl.text = auth.subscriber?['email'] ?? '';
        _phoneCtrl.text = auth.subscriber?['phone'] ?? '';
        _companyCtrl.text = auth.subscriber?['company'] ?? '';
      }
    });
  }

  Future<void> _pickImages() async {
    final picker = ImagePicker();
    final picked = await picker.pickMultiImage(limit: 10);
    if (picked.isNotEmpty) {
      setState(() => _images = [..._images, ...picked].take(10).toList());
    }
  }

  Future<void> _pickDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (date != null) setState(() => _startDate = date);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedService == null || _startDate == null) return;

    setState(() => _loading = true);

    // Simulate AI matching delay
    await Future.delayed(const Duration(seconds: 1));

    if (!mounted) return;
    setState(() => _loading = false);

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => FixerResultsScreen(
          bookingType: widget.type,
          service: _selectedService!,
          description: _descCtrl.text,
          date: _startDate!,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final locale = context.watch<LocaleProvider>();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Name
            TextFormField(
              controller: _nameCtrl,
              decoration: InputDecoration(
                labelText: '${locale.t('name')} *',
                prefixIcon: const Icon(Icons.person_outlined),
              ),
              validator: (v) => v == null || v.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            // Email
            TextFormField(
              controller: _emailCtrl,
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(
                labelText: '${locale.t('email')} *',
                prefixIcon: const Icon(Icons.email_outlined),
              ),
              validator: (v) {
                if (v == null || v.isEmpty) return 'Required';
                if (!RegExp(r'\S+@\S+\.\S+').hasMatch(v)) return 'Invalid email';
                return null;
              },
            ),
            const SizedBox(height: 12),
            // Phone
            TextFormField(
              controller: _phoneCtrl,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                labelText: '${locale.t('phone')} *',
                prefixIcon: const Icon(Icons.phone_outlined),
              ),
              validator: (v) => v == null || v.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            // Company
            TextFormField(
              controller: _companyCtrl,
              decoration: InputDecoration(
                labelText: '${locale.t('company')} *',
                prefixIcon: const Icon(Icons.business_outlined),
              ),
              validator: (v) => v == null || v.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            // Service dropdown
            DropdownButtonFormField<String>(
              initialValue: _selectedService,
              decoration: InputDecoration(
                labelText: '${locale.t('serviceInterest')} *',
                prefixIcon: const Icon(Icons.category_outlined),
              ),
              items: _services.map((s) => DropdownMenuItem(
                value: s['en'],
                child: Text(s[locale.locale] ?? s['en']!),
              )).toList(),
              onChanged: (v) => setState(() => _selectedService = v),
              validator: (v) => v == null ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            // Date picker
            InkWell(
              onTap: _pickDate,
              child: InputDecorator(
                decoration: InputDecoration(
                  labelText: '${locale.t('startDate')} *',
                  prefixIcon: const Icon(Icons.calendar_today),
                ),
                child: Text(
                  _startDate != null
                      ? '${_startDate!.year}-${_startDate!.month.toString().padLeft(2, '0')}-${_startDate!.day.toString().padLeft(2, '0')}'
                      : '',
                ),
              ),
            ),
            const SizedBox(height: 12),
            // Location: postal code
            TextFormField(
              controller: _postalCtrl,
              keyboardType: TextInputType.number,
              maxLength: 5,
              decoration: InputDecoration(
                labelText: locale.t('postalCode'),
                prefixIcon: const Icon(Icons.location_on_outlined),
                counterText: '',
              ),
            ),
            const SizedBox(height: 12),
            // Description
            TextFormField(
              controller: _descCtrl,
              maxLines: 4,
              decoration: InputDecoration(
                labelText: '${locale.t('description')} *',
                alignLabelWithHint: true,
              ),
              validator: (v) => v == null || v.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            // Image upload
            OutlinedButton.icon(
              onPressed: _pickImages,
              icon: const Icon(Icons.camera_alt_outlined),
              label: Text('${locale.t('uploadImages')} (${_images.length}/10)'),
            ),
            if (_images.isNotEmpty) ...[
              const SizedBox(height: 8),
              SizedBox(
                height: 80,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: _images.length,
                  itemBuilder: (context, i) => Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: Stack(
                      children: [
                        Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            color: AppTheme.borderLight,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.image, color: AppTheme.textMuted),
                        ),
                        Positioned(
                          top: 0,
                          right: 0,
                          child: GestureDetector(
                            onTap: () => setState(() => _images.removeAt(i)),
                            child: Container(
                              padding: const EdgeInsets.all(2),
                              decoration: const BoxDecoration(color: AppTheme.error, shape: BoxShape.circle),
                              child: const Icon(Icons.close, size: 14, color: Colors.white),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 24),
            // Submit
            ElevatedButton(
              onPressed: _loading ? null : _submit,
              child: _loading
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text(locale.t('submit')),
            ),
            const SizedBox(height: 12),
            // PDPA notice
            Text(
              locale.locale == 'th'
                  ? 'การส่งแบบฟอร์มนี้ถือว่าท่านยินยอม PDPA ข้อมูลเก็บ 3 ปี'
                  : locale.locale == 'zh'
                      ? '提交此表格即表示您同意PDPA，数据保留3年'
                      : 'By submitting you agree to PDPA data protection. Data retained 3 years.',
              style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
              textAlign: TextAlign.center,
            ),
          ],
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
    _descCtrl.dispose();
    _postalCtrl.dispose();
    super.dispose();
  }
}
