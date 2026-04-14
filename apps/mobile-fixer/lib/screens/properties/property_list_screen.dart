import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:dio/dio.dart';
import 'dart:io';
import '../../core/providers.dart';
import '../../core/theme.dart';
import '../../core/constants.dart';
import '../../services/api_service.dart';

class PropertyListScreen extends StatefulWidget {
  const PropertyListScreen({super.key});

  @override
  State<PropertyListScreen> createState() => _PropertyListScreenState();
}

class _PropertyListScreenState extends State<PropertyListScreen> {
  List<Map<String, dynamic>> _properties = [];
  bool _loading = true;
  String? _error;
  String _filter = 'all'; // all, SALE, RENT
  final _api = ApiService();

  @override
  void initState() {
    super.initState();
    _loadProperties();
  }

  Future<void> _loadProperties() async {
    setState(() { _loading = true; _error = null; });
    try {
      final res = await _api.getMyProperties();
      final data = res.data;
      final list = (data is List ? data : data['data'] ?? data['properties'] ?? []) as List;
      _properties = list.map((p) => Map<String, dynamic>.from(p as Map)).toList();
    } catch (e) {
      // Fallback to demo data if API unavailable
      _properties = [
        {'id': '1', 'title': 'Modern Condo Sukhumvit 39', 'type': 'Condo', 'listing': 'RENT', 'price': 25000, 'area': 45, 'beds': 1, 'baths': 1, 'tier': 'Standard', 'active': true, 'location': 'Sukhumvit, Bangkok', 'postal': '10110', 'desc': 'Fully furnished modern condo near BTS Phrom Phong.', 'images': 3, 'views': 124},
        {'id': '2', 'title': 'Townhouse Bangna 3BR', 'type': 'Townhouse', 'listing': 'SALE', 'price': 3500000, 'area': 150, 'beds': 3, 'baths': 2, 'tier': 'Upper', 'active': true, 'location': 'Bangna, Bangkok', 'postal': '10260', 'desc': 'Spacious townhouse with garden.', 'images': 5, 'views': 89},
        {'id': '3', 'title': 'Land Plot Chiang Mai 1 Rai', 'type': 'Land', 'listing': 'SALE', 'price': 1200000, 'area': 400, 'beds': 0, 'baths': 0, 'tier': 'Economy', 'active': false, 'location': 'Hang Dong, Chiang Mai', 'postal': '50230', 'desc': 'Flat land near main road.', 'images': 2, 'views': 32},
      ];
    }
    if (mounted) setState(() => _loading = false);
  }

  List<Map<String, dynamic>> get _filtered {
    if (_filter == 'all') return _properties;
    return _properties.where((p) => p['listing'] == _filter).toList();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.watch<LocaleProvider>().t;

    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    return Column(children: [
      // Filter + Add button
      Padding(
        padding: const EdgeInsets.all(12),
        child: Row(children: [
          ChoiceChip(label: const Text('All'), selected: _filter == 'all', onSelected: (_) => setState(() => _filter = 'all')),
          const SizedBox(width: 8),
          ChoiceChip(label: Text(t('for_sale')), selected: _filter == 'SALE', onSelected: (_) => setState(() => _filter = 'SALE')),
          const SizedBox(width: 8),
          ChoiceChip(label: Text(t('for_rent')), selected: _filter == 'RENT', onSelected: (_) => setState(() => _filter = 'RENT')),
          const Spacer(),
          FloatingActionButton.small(
            heroTag: 'add_prop',
            onPressed: () => _showAddEditSheet(context, t),
            backgroundColor: AppTheme.primaryGreen,
            child: const Icon(Icons.add, color: Colors.white),
          ),
        ]),
      ),

      // List
      Expanded(
        child: _filtered.isEmpty
            ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                const Icon(Icons.apartment, size: 64, color: AppTheme.textSecondary),
                const SizedBox(height: 12),
                Text(t('no_properties'), style: const TextStyle(color: AppTheme.textSecondary, fontSize: 16)),
                const SizedBox(height: 12),
                ElevatedButton.icon(icon: const Icon(Icons.add), label: Text(t('add_property')), onPressed: () => _showAddEditSheet(context, t)),
              ]))
            : RefreshIndicator(
                onRefresh: _loadProperties,
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  itemCount: _filtered.length,
                  itemBuilder: (_, i) => _PropertyCard(
                    property: _filtered[i],
                    t: t,
                    onEdit: () => _showAddEditSheet(context, t, existing: _filtered[i]),
                    onToggle: () => _toggleStatus(i),
                    onDelete: () => _confirmDelete(context, t, i),
                  ),
                ),
              ),
      ),
    ]);
  }

  Future<void> _toggleStatus(int index) async {
    final p = _filtered[index];
    final realIndex = _properties.indexOf(p);
    final newActive = !(p['active'] == true);
    setState(() => _properties[realIndex]['active'] = newActive);
    try {
      await _api.togglePropertyStatus(p['id'].toString(), newActive);
    } catch (_) { /* Optimistic update, ignore error */ }
  }

  void _confirmDelete(BuildContext context, String Function(String) t, int index) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(t('delete')),
        content: Text('Delete "${_filtered[index]['title']}"?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: Text(t('cancel'))),
          ElevatedButton(
            onPressed: () async {
              final p = _filtered[index];
              setState(() => _properties.remove(p));
              Navigator.pop(context);
              try {
                await _api.deleteProperty(p['id'].toString());
              } catch (_) { /* Optimistic delete */ }
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.errorRed),
            child: Text(t('delete')),
          ),
        ],
      ),
    );
  }

  void _showAddEditSheet(BuildContext context, String Function(String) t, {Map<String, dynamic>? existing}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _AddEditPropertySheet(
        t: t,
        existing: existing,
        onSave: (data, {List<File>? images}) async {
          if (existing != null) {
            final idx = _properties.indexOf(existing);
            setState(() => _properties[idx] = {...existing, ...data});
            try {
              await _api.updateProperty(existing['id'].toString(), data);
              // Upload images if any were selected
              if (images != null && images.isNotEmpty) {
                final formData = FormData();
                for (int i = 0; i < images.length; i++) {
                  formData.files.add(MapEntry('images', await MultipartFile.fromFile(images[i].path, filename: 'img_$i.jpg')));
                }
                await _api.uploadPropertyImages(existing['id'].toString(), formData);
              }
            } catch (_) { /* Optimistic update */ }
          } else {
            final tempId = DateTime.now().millisecondsSinceEpoch.toString();
            final newProp = {
              'id': tempId,
              ...data,
              'active': true,
              'tier': 'Economy',
              'images': images?.length ?? 0,
              'views': 0,
            };
            setState(() => _properties.add(newProp));
            try {
              final res = await _api.createProperty(data);
              final created = res.data;
              if (created != null && created['id'] != null) {
                final createdId = created['id'].toString();
                final idx = _properties.indexWhere((p) => p['id'] == tempId);
                if (idx >= 0) setState(() => _properties[idx]['id'] = createdId);
                // Upload images if any were selected
                if (images != null && images.isNotEmpty) {
                  final formData = FormData();
                  for (int i = 0; i < images.length; i++) {
                    formData.files.add(MapEntry('images', await MultipartFile.fromFile(images[i].path, filename: 'img_$i.jpg')));
                  }
                  await _api.uploadPropertyImages(createdId, formData);
                }
              }
            } catch (_) { /* Optimistic create */ }
          }
        },
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Property Card
// ---------------------------------------------------------------------------
class _PropertyCard extends StatelessWidget {
  final Map<String, dynamic> property;
  final String Function(String) t;
  final VoidCallback onEdit, onToggle, onDelete;

  const _PropertyCard({required this.property, required this.t, required this.onEdit, required this.onToggle, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final p = property;
    final isRent = p['listing'] == 'RENT';
    final isActive = p['active'] == true;
    final price = p['price'] as int;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Badges row
          Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: isRent ? AppTheme.primaryBlue : AppTheme.primaryGreen, borderRadius: BorderRadius.circular(6)),
              child: Text(isRent ? t('for_rent') : t('for_sale'), style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: isActive ? AppTheme.primaryGreen.withValues(alpha: 0.1) : AppTheme.textSecondary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(isActive ? t('active') : t('inactive'),
                  style: TextStyle(color: isActive ? AppTheme.primaryGreen : AppTheme.textSecondary, fontSize: 11, fontWeight: FontWeight.w600)),
            ),
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: AppTheme.warningOrange.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
              child: Text('${p['tier']}', style: const TextStyle(color: AppTheme.warningOrange, fontSize: 11, fontWeight: FontWeight.w600)),
            ),
          ]),
          const SizedBox(height: 10),

          // Title + type
          Text(p['title'] as String, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text('${p['type']}  •  ${p['location']}', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
          const SizedBox(height: 6),

          // Price
          Text(
            isRent ? '฿${_formatPrice(price)}${t('per_month')}' : '฿${_formatPrice(price)}',
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.primaryBlue),
          ),
          const SizedBox(height: 8),

          // Details row
          Row(children: [
            _Detail(icon: Icons.square_foot, text: '${p['area']} sqm'),
            if ((p['beds'] as int) > 0) _Detail(icon: Icons.bed, text: '${p['beds']}'),
            if ((p['baths'] as int) > 0) _Detail(icon: Icons.bathtub, text: '${p['baths']}'),
            const Spacer(),
            Text('📷 ${p['images']}  •  👁 ${p['views']}', style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
          ]),
          const SizedBox(height: 4),
          Text(p['desc'] as String, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
          const SizedBox(height: 12),

          // Actions
          Row(children: [
            OutlinedButton.icon(onPressed: onEdit, icon: const Icon(Icons.edit, size: 16), label: Text(t('edit'))),
            const SizedBox(width: 8),
            OutlinedButton.icon(
              onPressed: onToggle,
              icon: Icon(isActive ? Icons.visibility_off : Icons.visibility, size: 16),
              label: Text(isActive ? t('deactivate') : t('activate')),
            ),
            const Spacer(),
            IconButton(onPressed: onDelete, icon: const Icon(Icons.delete_outline, color: AppTheme.errorRed)),
          ]),
        ]),
      ),
    );
  }

  String _formatPrice(int price) {
    if (price >= 1000000) return '${(price / 1000000).toStringAsFixed(1)}M';
    if (price >= 1000) return '${(price / 1000).toStringAsFixed(0)},000';
    return price.toString();
  }
}

class _Detail extends StatelessWidget {
  final IconData icon;
  final String text;
  const _Detail({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 16),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 16, color: AppTheme.textSecondary),
        const SizedBox(width: 4),
        Text(text, style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
      ]),
    );
  }
}

// ---------------------------------------------------------------------------
// Add/Edit Property Bottom Sheet
// ---------------------------------------------------------------------------
class _AddEditPropertySheet extends StatefulWidget {
  final String Function(String) t;
  final Map<String, dynamic>? existing;
  final void Function(Map<String, dynamic> data, {List<File>? images}) onSave;

  const _AddEditPropertySheet({required this.t, this.existing, required this.onSave});

  @override
  State<_AddEditPropertySheet> createState() => _AddEditPropertySheetState();
}

class _AddEditPropertySheetState extends State<_AddEditPropertySheet> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _title, _price, _area, _beds, _baths, _location, _postal, _desc;
  late String _type, _listing;
  final List<File> _images = [];

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    _title = TextEditingController(text: e?['title'] ?? '');
    _price = TextEditingController(text: e != null ? '${e['price']}' : '');
    _area = TextEditingController(text: e != null ? '${e['area']}' : '');
    _beds = TextEditingController(text: e != null ? '${e['beds']}' : '0');
    _baths = TextEditingController(text: e != null ? '${e['baths']}' : '0');
    _location = TextEditingController(text: e?['location'] ?? '');
    _postal = TextEditingController(text: e?['postal'] ?? '');
    _desc = TextEditingController(text: e?['desc'] ?? '');
    _type = e?['type'] ?? 'Condo';
    _listing = e?['listing'] ?? 'SALE';
  }

  Future<void> _pickImages() async {
    if (_images.length >= 10) return;
    final picker = ImagePicker();
    final picked = await picker.pickMultiImage(maxWidth: 1200, imageQuality: 85);
    setState(() {
      for (final p in picked) {
        if (_images.length < 10) _images.add(File(p.path));
      }
    });
  }

  void _save() {
    if (!_formKey.currentState!.validate()) return;
    widget.onSave({
      'title': _title.text.trim(),
      'type': _type,
      'listing': _listing,
      'price': int.tryParse(_price.text) ?? 0,
      'area': int.tryParse(_area.text) ?? 0,
      'beds': int.tryParse(_beds.text) ?? 0,
      'baths': int.tryParse(_baths.text) ?? 0,
      'location': _location.text.trim(),
      'postal': _postal.text.trim(),
      'desc': _desc.text.trim(),
    }, images: _images.isNotEmpty ? _images : null);
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final t = widget.t;
    final isEdit = widget.existing != null;

    return DraggableScrollableSheet(
      initialChildSize: 0.9,
      maxChildSize: 0.95,
      minChildSize: 0.5,
      expand: false,
      builder: (_, controller) => Container(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: ListView(controller: controller, children: [
            // Header
            Row(children: [
              Text(isEdit ? '${t('edit')} Property' : t('add_property'), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const Spacer(),
              IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
            ]),
            const SizedBox(height: 16),

            // Listing type toggle (SALE / RENT)
            Text(t('listing_type'), style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(
                child: ChoiceChip(
                  label: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                    const Icon(Icons.sell, size: 16),
                    const SizedBox(width: 6),
                    Text(t('for_sale')),
                  ]),
                  selected: _listing == 'SALE',
                  onSelected: (_) => setState(() => _listing = 'SALE'),
                  selectedColor: AppTheme.primaryGreen.withValues(alpha: 0.2),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ChoiceChip(
                  label: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                    const Icon(Icons.home_work, size: 16),
                    const SizedBox(width: 6),
                    Text(t('for_rent')),
                  ]),
                  selected: _listing == 'RENT',
                  onSelected: (_) => setState(() => _listing = 'RENT'),
                  selectedColor: AppTheme.primaryBlue.withValues(alpha: 0.2),
                ),
              ),
            ]),
            const SizedBox(height: 16),

            // Title
            TextFormField(controller: _title, decoration: InputDecoration(labelText: 'Title'), validator: (v) => v != null && v.isNotEmpty ? null : 'Required'),
            const SizedBox(height: 12),

            // Property type dropdown
            DropdownButtonFormField<String>(
              initialValue: _type,
              decoration: InputDecoration(labelText: t('property_type')),
              items: AppConstants.propertyTypes.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
              onChanged: (v) => setState(() => _type = v!),
            ),
            const SizedBox(height: 12),

            // Price
            TextFormField(
              controller: _price,
              decoration: InputDecoration(labelText: t('price'), prefixText: '฿ ', suffixText: _listing == 'RENT' ? t('per_month') : null),
              keyboardType: TextInputType.number,
              validator: (v) => v != null && v.isNotEmpty && (int.tryParse(v) ?? 0) > 0 ? null : 'Required',
            ),
            const SizedBox(height: 12),

            // Area
            TextFormField(controller: _area, decoration: InputDecoration(labelText: t('area_sqm')), keyboardType: TextInputType.number, validator: (v) => v != null && v.isNotEmpty ? null : 'Required'),
            const SizedBox(height: 12),

            // Beds & Baths
            Row(children: [
              Expanded(child: TextFormField(controller: _beds, decoration: InputDecoration(labelText: t('bedrooms')), keyboardType: TextInputType.number)),
              const SizedBox(width: 12),
              Expanded(child: TextFormField(controller: _baths, decoration: InputDecoration(labelText: t('bathrooms')), keyboardType: TextInputType.number)),
            ]),
            const SizedBox(height: 12),

            // Location & postal
            TextFormField(controller: _location, decoration: InputDecoration(labelText: t('location')), validator: (v) => v != null && v.isNotEmpty ? null : 'Required'),
            const SizedBox(height: 12),
            TextFormField(controller: _postal, decoration: InputDecoration(labelText: t('postal_code')), keyboardType: TextInputType.number),
            const SizedBox(height: 12),

            // Description
            TextFormField(controller: _desc, decoration: InputDecoration(labelText: t('description')), maxLines: 3, validator: (v) => v != null && v.isNotEmpty ? null : 'Required'),
            const SizedBox(height: 16),

            // Image upload
            Text(t('upload_images'), style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            if (_images.isNotEmpty)
              SizedBox(
                height: 100,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: _images.length,
                  itemBuilder: (_, i) => Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: Stack(children: [
                      ClipRRect(borderRadius: BorderRadius.circular(8), child: Image.file(_images[i], width: 100, height: 100, fit: BoxFit.cover)),
                      Positioned(
                        top: 2, right: 2,
                        child: GestureDetector(
                          onTap: () => setState(() => _images.removeAt(i)),
                          child: Container(decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle), child: const Icon(Icons.close, size: 18, color: Colors.white)),
                        ),
                      ),
                    ]),
                  ),
                ),
              ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: _images.length < 10 ? _pickImages : null,
              icon: const Icon(Icons.add_photo_alternate),
              label: Text('${_images.length}/10 ${t('upload_images')}'),
            ),
            const SizedBox(height: 24),

            // Save button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _save,
                icon: const Icon(Icons.check),
                label: Text(isEdit ? t('save') : t('add_property')),
                style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
              ),
            ),
            const SizedBox(height: 16),
          ]),
        ),
      ),
    );
  }
}
