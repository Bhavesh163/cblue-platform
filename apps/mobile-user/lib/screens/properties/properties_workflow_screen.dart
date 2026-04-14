import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'dart:math';
import '../../core/providers.dart';
import '../../core/theme.dart';
import '../../core/constants.dart';

/// Properties 8-step workflow: tier → payment → po → notify → chat → meeting → rate → done
class PropertiesWorkflowScreen extends StatefulWidget {
  final Map<String, dynamic> property;
  const PropertiesWorkflowScreen({super.key, required this.property});

  @override
  State<PropertiesWorkflowScreen> createState() => _PropertiesWorkflowScreenState();
}

class _PropertiesWorkflowScreenState extends State<PropertiesWorkflowScreen> {
  static const _steps = ['tier', 'payment', 'po', 'notify', 'chat', 'meeting', 'rate', 'done'];
  int _currentStep = 0;
  String get _step => _steps[_currentStep];

  // State
  String _selectedTier = 'Economy';
  String _poNumber = '';
  bool _listerConfirmed = false;
  int _customerRating = 0;
  String _customerComment = '';
  int _listerRating = 0;
  bool _listerRated = false;
  final _chatCtrl = TextEditingController();
  final List<Map<String, String>> _messages = [];

  void _next() {
    if (_currentStep < _steps.length - 1) {
      setState(() => _currentStep++);
      // Auto-actions
      if (_step == 'po') _generatePo();
      if (_step == 'notify') _simulateListerConfirm();
    }
  }

  void _generatePo() {
    final now = DateTime.now();
    final rng = Random();
    _poNumber = 'PO-${now.year % 100}${now.month.toString().padLeft(2, '0')}-${rng.nextInt(9000) + 1000}';
  }

  void _simulateListerConfirm() {
    Future.delayed(const Duration(seconds: 4), () {
      if (mounted) setState(() { _listerConfirmed = true; });
    });
  }

  void _simulateListerRating() {
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) {
        setState(() {
          _listerRating = 3 + Random().nextInt(3); // 3-5
          _listerRated = true;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final t = context.watch<LocaleProvider>().t;
    final p = widget.property;

    return Scaffold(
      appBar: AppBar(
        title: Text(p['title'] as String? ?? t('properties')),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(6),
          child: LinearProgressIndicator(
            value: (_currentStep + 1) / _steps.length,
            backgroundColor: Colors.white24,
            valueColor: const AlwaysStoppedAnimation(AppTheme.primaryGreen),
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(children: [
          // Step indicator
          Text('${t('step')} ${_currentStep + 1}/${_steps.length}',
              style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
          const SizedBox(height: 16),
          _buildStep(t, p),
        ]),
      ),
    );
  }

  Widget _buildStep(String Function(String) t, Map<String, dynamic> p) {
    switch (_step) {
      case 'tier': return _tierStep(t, p);
      case 'payment': return _paymentStep(t);
      case 'po': return _poStep(t, p);
      case 'notify': return _notifyStep(t);
      case 'chat': return _chatStep(t, p);
      case 'meeting': return _meetingStep(t);
      case 'rate': return _rateStep(t);
      case 'done': return _doneStep(t, p);
      default: return const SizedBox();
    }
  }

  // ── Step 1: Tier Selection ──────────────────────────────────────────
  Widget _tierStep(String Function(String) t, Map<String, dynamic> p) {
    return Column(children: [
      const Icon(Icons.apartment, size: 48, color: AppTheme.primaryBlue),
      const SizedBox(height: 12),
      Text(p['title'] as String? ?? '', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
      const SizedBox(height: 4),
      Text('${p['type']} • ${p['listing'] == 'RENT' ? t('for_rent') : t('for_sale')}',
          style: const TextStyle(color: AppTheme.textSecondary)),
      Text(p['price'] as String? ?? '', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.primaryBlue)),
      const SizedBox(height: 24),
      Text(t('select_tier'), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
      const SizedBox(height: 12),
      ...AppConstants.propertyTiers.map((tier) {
        final fee = AppConstants.tierFees[tier] ?? 200;
        final selected = _selectedTier == tier;
        return Card(
          color: selected ? AppTheme.primaryBlue.withValues(alpha: 0.08) : null,
          child: RadioListTile<String>(
            value: tier,
            groupValue: _selectedTier,
            onChanged: (v) => setState(() => _selectedTier = v!),
            title: Text(tier, style: TextStyle(fontWeight: selected ? FontWeight.bold : FontWeight.normal)),
            subtitle: Text('${t('processing_fee')}: ฿$fee'),
            secondary: selected ? const Icon(Icons.check_circle, color: AppTheme.primaryGreen) : null,
          ),
        );
      }),
      const SizedBox(height: 20),
      _disclaimer(t),
      const SizedBox(height: 16),
      _nextButton(t('confirm'), onPressed: _next),
    ]);
  }

  // ── Step 2: Payment ─────────────────────────────────────────────────
  Widget _paymentStep(String Function(String) t) {
    final fee = AppConstants.tierFees[_selectedTier] ?? 200;
    return Column(children: [
      const Icon(Icons.qr_code_2, size: 64, color: AppTheme.primaryBlue),
      const SizedBox(height: 16),
      Text(t('promptPayQR'), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
      const SizedBox(height: 12),
      Container(
        width: 180, height: 180,
        decoration: BoxDecoration(
          border: Border.all(color: AppTheme.primaryBlue, width: 2),
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Center(child: Icon(Icons.qr_code, size: 120, color: AppTheme.primaryBlue)),
      ),
      const SizedBox(height: 16),
      Text('${t('processing_fee')}: ฿$fee', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.primaryGreen)),
      const SizedBox(height: 8),
      Text('${t('tier')}: $_selectedTier', style: const TextStyle(color: AppTheme.textSecondary)),
      const SizedBox(height: 8),
      Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: AppTheme.warning.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
        child: Row(children: [
          const Icon(Icons.warning_amber, color: AppTheme.warning, size: 18),
          const SizedBox(width: 8),
          Expanded(child: Text(t('non_refundable_fee'), style: TextStyle(fontSize: 12, color: AppTheme.warning))),
        ]),
      ),
      const SizedBox(height: 20),
      _nextButton(t('payment_done'), onPressed: _next),
    ]);
  }

  // ── Step 3: PO ──────────────────────────────────────────────────────
  Widget _poStep(String Function(String) t, Map<String, dynamic> p) {
    final auth = context.read<AuthProvider>();
    return Column(children: [
      const Icon(Icons.description, size: 48, color: AppTheme.primaryGreen),
      const SizedBox(height: 12),
      Text(t('purchaseOrder'), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
      const SizedBox(height: 8),
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(color: AppTheme.primaryBlue, borderRadius: BorderRadius.circular(8)),
        child: Text(_poNumber, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold, letterSpacing: 2)),
      ),
      const SizedBox(height: 20),
      _infoCard([
        _infoRow(t('full_name'), auth.displayName),
        _infoRow(t('property_label'), p['title'] as String? ?? ''),
        _infoRow(t('property_type'), p['type'] as String? ?? ''),
        _infoRow(t('listing_type'), p['listing'] as String? ?? ''),
        _infoRow(t('price'), p['price'] as String? ?? ''),
        _infoRow(t('tier'), _selectedTier),
        _infoRow(t('processing_fee'), '฿${AppConstants.tierFees[_selectedTier] ?? 200}'),
      ]),
      const SizedBox(height: 16),
      _disclaimer(t),
      const SizedBox(height: 16),
      _nextButton(t('confirm'), onPressed: _next),
    ]);
  }

  // ── Step 4: Notify Lister ───────────────────────────────────────────
  Widget _notifyStep(String Function(String) t) {
    return Column(children: [
      if (!_listerConfirmed) ...[
        const SizedBox(height: 40),
        const CircularProgressIndicator(),
        const SizedBox(height: 20),
        Text(t('notifying_lister'), style: const TextStyle(fontSize: 16)),
        const SizedBox(height: 8),
        Text(t('waiting_confirmation'), style: const TextStyle(color: AppTheme.textSecondary)),
      ] else ...[
        const SizedBox(height: 20),
        const Icon(Icons.check_circle, size: 64, color: AppTheme.primaryGreen),
        const SizedBox(height: 16),
        Text(t('lister_confirmed'), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.primaryGreen)),
        const SizedBox(height: 8),
        Text(_poNumber, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 14)),
        const SizedBox(height: 24),
        _nextButton(t('chat'), onPressed: _next),
      ],
    ]);
  }

  // ── Step 5: Chat ────────────────────────────────────────────────────
  Widget _chatStep(String Function(String) t, Map<String, dynamic> p) {
    return Column(children: [
      // Property details panel
      Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(p['title'] as String? ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
            Text('${p['type']} • ${p['listing']}', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
          ]),
        ),
      ),
      // Anonymous safety notice
      Container(
        padding: const EdgeInsets.all(10),
        margin: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(color: AppTheme.warning.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
        child: Row(children: [
          const Icon(Icons.security, size: 16, color: AppTheme.warning),
          const SizedBox(width: 8),
          Expanded(child: Text(t('anonymous_chat'), style: const TextStyle(fontSize: 12, color: AppTheme.warning))),
        ]),
      ),
      // Chat messages
      Container(
        height: 250,
        decoration: BoxDecoration(border: Border.all(color: Colors.grey.shade300), borderRadius: BorderRadius.circular(12)),
        child: Column(children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: _messages.length,
              itemBuilder: (_, i) {
                final m = _messages[i];
                final isMe = m['from'] == 'me';
                return Align(
                  alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 6),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.6),
                    decoration: BoxDecoration(
                      color: isMe ? AppTheme.primaryBlue : AppTheme.backgroundWhite,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(m['text']!, style: TextStyle(color: isMe ? Colors.white : AppTheme.textPrimary, fontSize: 14)),
                  ),
                );
              },
            ),
          ),
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(border: Border(top: BorderSide(color: Colors.grey.shade300))),
            child: Row(children: [
              Expanded(child: TextField(controller: _chatCtrl, decoration: InputDecoration(hintText: t('message_hint'), isDense: true, contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)))),
              IconButton(
                icon: const Icon(Icons.send, color: AppTheme.primaryBlue),
                onPressed: () {
                  if (_chatCtrl.text.trim().isEmpty) return;
                  setState(() {
                    _messages.add({'from': 'me', 'text': _chatCtrl.text.trim()});
                    _chatCtrl.clear();
                  });
                  Future.delayed(const Duration(seconds: 1), () {
                    if (mounted) setState(() => _messages.add({'from': 'lister', 'text': t('auto_reply')}));
                  });
                },
              ),
            ]),
          ),
        ]),
      ),
      const SizedBox(height: 16),
      _nextButton(t('schedule_meeting'), onPressed: _next),
    ]);
  }

  // ── Step 6: Meeting ─────────────────────────────────────────────────
  Widget _meetingStep(String Function(String) t) {
    return Column(children: [
      const Icon(Icons.calendar_today, size: 48, color: AppTheme.primaryBlue),
      const SizedBox(height: 12),
      Text(t('schedule_meeting'), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
      const SizedBox(height: 20),
      _infoCard([
        _infoRow(t('poNumber'), _poNumber),
        _infoRow(t('tier'), _selectedTier),
        _infoRow(t('processing_fee'), '฿${AppConstants.tierFees[_selectedTier] ?? 200}'),
      ]),
      const SizedBox(height: 16),
      _disclaimer(t),
      const SizedBox(height: 20),
      _nextButton(t('confirm_meeting'), onPressed: _next),
    ]);
  }

  // ── Step 7: Rate ────────────────────────────────────────────────────
  Widget _rateStep(String Function(String) t) {
    return Column(children: [
      const Icon(Icons.star, size: 48, color: AppTheme.warning),
      const SizedBox(height: 12),
      Text(t('rate_experience'), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
      const SizedBox(height: 20),

      // Customer rates first
      Text(t('your_rating'), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
      const SizedBox(height: 12),
      Row(mainAxisAlignment: MainAxisAlignment.center, children: List.generate(5, (i) => GestureDetector(
        onTap: () => setState(() => _customerRating = i + 1),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Icon(i < _customerRating ? Icons.star : Icons.star_border, size: 40, color: AppTheme.warning),
        ),
      ))),
      const SizedBox(height: 12),
      TextField(
        decoration: InputDecoration(hintText: t('comment')),
        maxLines: 3,
        onChanged: (v) => _customerComment = v,
      ),
      const SizedBox(height: 16),

      if (_customerRating > 0 && !_listerRated) ...[
        ElevatedButton(
          onPressed: () => _simulateListerRating(),
          child: Text(t('submit_rating')),
        ),
      ],

      // Lister rating appears after 3s
      if (_listerRated) ...[
        const SizedBox(height: 24),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: AppTheme.backgroundWhite, borderRadius: BorderRadius.circular(12)),
          child: Column(children: [
            Text(t('lister_rating'), style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Row(mainAxisAlignment: MainAxisAlignment.center, children: List.generate(5, (i) => Icon(
              i < _listerRating ? Icons.star : Icons.star_border, size: 32, color: AppTheme.warning,
            ))),
          ]),
        ),
        const SizedBox(height: 20),
        _nextButton(t('view_summary'), onPressed: _next),
      ],
    ]);
  }

  // ── Step 8: Done ────────────────────────────────────────────────────
  Widget _doneStep(String Function(String) t, Map<String, dynamic> p) {
    return Column(children: [
      const Icon(Icons.celebration, size: 64, color: AppTheme.primaryGreen),
      const SizedBox(height: 16),
      Text(t('workflow_complete'), style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.primaryGreen)),
      const SizedBox(height: 20),
      _infoCard([
        _infoRow(t('poNumber'), _poNumber),
        _infoRow(t('property_label'), p['title'] as String? ?? ''),
        _infoRow(t('tier'), _selectedTier),
        _infoRow(t('processing_fee'), '฿${AppConstants.tierFees[_selectedTier] ?? 200}'),
        _infoRow(t('your_rating'), '⭐ $_customerRating/5'),
        _infoRow(t('lister_rating'), '⭐ $_listerRating/5'),
      ]),
      const SizedBox(height: 24),
      SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: () => Navigator.of(context).popUntil((r) => r.isFirst),
          icon: const Icon(Icons.home),
          label: Text(t('back_to_home')),
        ),
      ),
    ]);
  }

  // ── Helpers ─────────────────────────────────────────────────────────
  Widget _nextButton(String label, {required VoidCallback onPressed}) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(onPressed: onPressed, style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)), child: Text(label, style: const TextStyle(fontSize: 16))),
    );
  }

  Widget _disclaimer(String Function(String) t) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(color: AppTheme.backgroundWhite, borderRadius: BorderRadius.circular(8)),
      child: Row(children: [
        const Icon(Icons.info_outline, size: 16, color: AppTheme.textSecondary),
        const SizedBox(width: 8),
        Expanded(child: Text(t('fee_disclaimer'), style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary))),
      ]),
    );
  }

  Widget _infoCard(List<Widget> rows) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(children: rows),
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(children: [
        Expanded(child: Text(label, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 14))),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
      ]),
    );
  }
}
