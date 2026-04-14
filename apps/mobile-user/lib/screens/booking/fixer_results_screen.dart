import 'dart:math';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../core/constants.dart';
import '../../core/providers.dart';

class FixerResultsScreen extends StatefulWidget {
  final String bookingType;
  final String service;
  final String description;
  final DateTime date;

  const FixerResultsScreen({
    super.key,
    required this.bookingType,
    required this.service,
    required this.description,
    required this.date,
  });

  @override
  State<FixerResultsScreen> createState() => _FixerResultsScreenState();
}

class _FixerResultsScreenState extends State<FixerResultsScreen> {
  // 12-step flow
  static const List<String> _steps = [
    'matching', 'list', 'confirm', 'po', 'notify',
    'payment', 'chat', 'meeting', 'variation', 'complete', 'rate', 'done'
  ];

  int _currentStep = 0;
  List<Map<String, dynamic>> _partners = [];
  int? _selectedPartner;
  String _poNumber = '';
  bool _partnerConfirmed = false;
  bool _paymentDone = false;
  int _customerRating = 0;
  String _customerComment = '';
  int _partnerRating = 0;
  bool _variationApproved = false;
  bool _hasVariation = false;
  final _nominationCtrl = TextEditingController();
  final _chatController = TextEditingController();
  final List<Map<String, String>> _chatMessages = [];

  @override
  void initState() {
    super.initState();
    _generatePartners();
    // Auto-advance from matching
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) setState(() => _currentStep = 1);
    });
  }

  void _generatePartners() {
    final rng = Random();
    final tiers = AppConstants.fixerTiers;
    final pool = List.generate(18, (i) {
      final tier = tiers[rng.nextInt(tiers.length)];
      return {
        'id': 'FIX-${1000 + rng.nextInt(9000)}',
        'tier': tier,
        'stars': (3.0 + rng.nextDouble() * 2).toStringAsFixed(1),
        'jobs': 10 + rng.nextInt(200),
        'price': (AppConstants.tierFees[tier] ?? 200) + rng.nextInt(500),
        'criteria': '',
        'returning': false,
      };
    });

    // Sort and select top 8
    pool.sort((a, b) => (a['price'] as int).compareTo(b['price'] as int));
    final selected = <Map<String, dynamic>>[];

    // Slots 1-2: cheapest
    selected.add({...pool[0], 'criteria': '💰 Cheapest'});
    selected.add({...pool[1], 'criteria': '💰 Cheapest'});

    // Slots 3-4: highest rated
    pool.sort((a, b) => double.parse(b['stars'] as String).compareTo(double.parse(a['stars'] as String)));
    for (final p in pool) {
      if (selected.every((s) => s['id'] != p['id'])) {
        selected.add({...p, 'criteria': '⭐ Highest Rated'});
        if (selected.length >= 4) break;
      }
    }

    // Slot 5: cheapest upper tier
    final upperPool = pool.where((p) => ['Corporate', 'Specialist', 'Expert'].contains(p['tier'])).toList();
    upperPool.sort((a, b) => (a['price'] as int).compareTo(b['price'] as int));
    for (final p in upperPool) {
      if (selected.every((s) => s['id'] != p['id'])) {
        selected.add({...p, 'criteria': '🏆 Best Upper Tier'});
        break;
      }
    }

    // Slot 6: highest rated upper tier
    upperPool.sort((a, b) => double.parse(b['stars'] as String).compareTo(double.parse(a['stars'] as String)));
    for (final p in upperPool) {
      if (selected.every((s) => s['id'] != p['id'])) {
        selected.add({...p, 'criteria': '🏆 Top Upper Tier'});
        break;
      }
    }

    // Slot 7: returning partner
    final returning = pool.firstWhere(
      (p) => selected.every((s) => s['id'] != p['id']),
      orElse: () => pool.last,
    );
    selected.add({...returning, 'criteria': '🔄 Returning', 'returning': true});

    // Slot 8: reserved for nomination
    _partners = selected.take(7).toList();
    _poNumber = 'PO-${DateTime.now().year % 100}${DateTime.now().month.toString().padLeft(2, '0')}-${rng.nextInt(9000) + 1000}';
    _hasVariation = rng.nextBool();
  }

  void _nextStep() {
    if (_currentStep < _steps.length - 1) {
      setState(() => _currentStep++);

      // Auto-simulate partner confirmation at notify step
      if (_steps[_currentStep] == 'notify') {
        Future.delayed(const Duration(seconds: 4), () {
          if (mounted) setState(() => _partnerConfirmed = true);
        });
      }

      // Skip variation if none
      if (_steps[_currentStep] == 'variation' && !_hasVariation) {
        Future.delayed(const Duration(milliseconds: 500), () {
          if (mounted) setState(() => _currentStep++);
        });
      }

      // Simulate partner rating after customer rates
      if (_steps[_currentStep] == 'rate' && _customerRating > 0) {
        Future.delayed(const Duration(seconds: 3), () {
          if (mounted) setState(() => _partnerRating = 3 + Random().nextInt(3));
        });
      }
    }
  }

  void _sendChatMessage() {
    final text = _chatController.text.trim();
    if (text.isEmpty) return;
    setState(() {
      _chatMessages.add({'sender': 'me', 'text': text});
      _chatController.clear();
    });
    // Auto-reply from partner after 1.5s
    Future.delayed(const Duration(milliseconds: 1500), () {
      if (mounted) {
        setState(() {
          _chatMessages.add({'sender': 'partner', 'text': 'Thank you, I will review and get back to you shortly.'});
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final step = _steps[_currentStep];

    return Scaffold(
      appBar: AppBar(
        title: Text(locale.locale == 'th' ? 'ผลการจับคู่ AI' : locale.locale == 'zh' ? 'AI匹配结果' : 'AI Matching Results'),
      ),
      body: Column(
        children: [
          // Progress bar
          _ProgressBar(currentStep: _currentStep, totalSteps: _steps.length),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Text(
              '${locale.locale == 'th' ? 'ขั้นตอน' : locale.locale == 'zh' ? '步骤' : 'Step'} ${_currentStep + 1}/${_steps.length}: ${locale.t(step)}',
              style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
            ),
          ),
          const Divider(height: 1),
          // Content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: _buildStepContent(step, locale),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepContent(String step, LocaleProvider locale) {
    switch (step) {
      case 'matching':
        return _buildMatching(locale);
      case 'list':
        return _buildList(locale);
      case 'confirm':
        return _buildConfirm(locale);
      case 'po':
        return _buildPO(locale);
      case 'notify':
        return _buildNotify(locale);
      case 'payment':
        return _buildPayment(locale);
      case 'chat':
        return _buildChat(locale);
      case 'meeting':
        return _buildMeeting(locale);
      case 'variation':
        return _buildVariation(locale);
      case 'complete':
        return _buildComplete(locale);
      case 'rate':
        return _buildRate(locale);
      case 'done':
        return _buildDone(locale);
      default:
        return const SizedBox();
    }
  }

  Widget _buildMatching(LocaleProvider locale) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(height: 40),
          const SizedBox(
            width: 60,
            height: 60,
            child: CircularProgressIndicator(strokeWidth: 4, color: AppTheme.primaryBlue),
          ),
          const SizedBox(height: 24),
          Text(
            locale.t('aiMatching'),
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            locale.locale == 'th'
                ? 'กำลังค้นหาช่างและมืออาชีพที่ดีที่สุดสำหรับคุณ...'
                : locale.locale == 'zh'
                    ? '正在为您寻找最佳的维修师和专业人士...'
                    : 'Finding the best fixers and professionals for you...',
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppTheme.textSecondary),
          ),
        ],
      ),
    );
  }

  Widget _buildList(LocaleProvider locale) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Criteria legend
        Container(
          padding: const EdgeInsets.all(12),
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            color: AppTheme.primaryBlue.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppTheme.primaryBlue.withValues(alpha: 0.15)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                locale.locale == 'th' ? 'เกณฑ์การคัดเลือก:' : locale.locale == 'zh' ? '选择标准:' : 'Selection Criteria:',
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
              ),
              const SizedBox(height: 4),
              const Text('💰 2 cheapest  ⭐ 2 highest rated  🏆 Upper tier  🔄 Returning  👤 Your nomination',
                  style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
            ],
          ),
        ),
        // Partner cards
        ...List.generate(_partners.length, (i) {
          final p = _partners[i];
          final isSelected = _selectedPartner == i;
          return GestureDetector(
            onTap: () => setState(() => _selectedPartner = i),
            child: Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: isSelected ? AppTheme.primaryBlue : AppTheme.borderLight, width: isSelected ? 2 : 1),
              ),
              child: Row(
                children: [
                  // Avatar
                  CircleAvatar(
                    backgroundColor: AppTheme.primaryBlue.withValues(alpha: 0.1),
                    child: Text('${i + 1}', style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryBlue)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(p['returning'] == true ? '★ ${p['id']}' : p['id'],
                                style: const TextStyle(fontWeight: FontWeight.w600)),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppTheme.primaryGreen.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(p['tier'], style: const TextStyle(fontSize: 10, color: AppTheme.primaryGreen)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.star, size: 14, color: AppTheme.star),
                            Text(' ${p['stars']}', style: const TextStyle(fontSize: 13)),
                            const SizedBox(width: 12),
                            Text('${p['jobs']} jobs', style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                            const SizedBox(width: 12),
                            Text('฿${p['price']}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.primaryBlue)),
                          ],
                        ),
                        if (p['criteria'] != null && (p['criteria'] as String).isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(p['criteria'], style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                          ),
                      ],
                    ),
                  ),
                  if (isSelected) const Icon(Icons.check_circle, color: AppTheme.primaryBlue),
                ],
              ),
            ),
          );
        }),
        // Nomination field (slot 8)
        if (_partners.length < 8) ...[
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: _nominationCtrl,
                  decoration: InputDecoration(
                    hintText: locale.locale == 'th' ? '👤 เสนอ ID พาร์ทเนอร์' : locale.locale == 'zh' ? '👤 提名合作伙伴ID' : '👤 Nominate partner ID',
                    isDense: true,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: () {
                  if (_nominationCtrl.text.isNotEmpty) {
                    setState(() {
                      _partners.add({
                        'id': _nominationCtrl.text.toUpperCase(),
                        'tier': 'Standard',
                        'stars': '4.0',
                        'jobs': 25,
                        'price': 350,
                        'criteria': '👤 Your Nomination',
                        'returning': false,
                      });
                      _nominationCtrl.clear();
                    });
                  }
                },
                style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 12)),
                child: Text(locale.locale == 'th' ? 'เพิ่ม' : locale.locale == 'zh' ? '添加' : 'Add'),
              ),
            ],
          ),
        ],
        const SizedBox(height: 16),
        if (_selectedPartner != null)
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _nextStep,
              child: Text(locale.t('confirm')),
            ),
          ),
      ],
    );
  }

  Widget _buildConfirm(LocaleProvider locale) {
    final p = _partners[_selectedPartner!];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(locale.locale == 'th' ? 'ยืนยันการเลือก' : locale.locale == 'zh' ? '确认选择' : 'Confirm Selection',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),
        _InfoRow(label: locale.locale == 'th' ? 'พาร์ทเนอร์' : 'Partner', value: p['id']),
        _InfoRow(label: locale.t('tier'), value: p['tier']),
        _InfoRow(label: locale.locale == 'th' ? 'ราคา' : locale.locale == 'zh' ? '价格' : 'Price', value: '฿${p['price']}'),
        _InfoRow(label: locale.t('processingFee'), value: '฿${AppConstants.tierFees[p['tier']] ?? 200}'),
        const SizedBox(height: 8),
        Text(
          locale.locale == 'th'
              ? '⚠️ ค่าดำเนินการไม่สามารถคืนเงินได้'
              : locale.locale == 'zh'
                  ? '⚠️ 手续费不可退还'
                  : '⚠️ Processing fee is non-refundable',
          style: const TextStyle(fontSize: 12, color: AppTheme.warning),
        ),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _nextStep,
            child: Text(locale.t('confirm')),
          ),
        ),
      ],
    );
  }

  Widget _buildPO(LocaleProvider locale) {
    final auth = context.read<AuthProvider>();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Center(
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.primaryBlue.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.primaryBlue.withValues(alpha: 0.2)),
            ),
            child: Column(
              children: [
                const Icon(Icons.description, size: 40, color: AppTheme.primaryBlue),
                const SizedBox(height: 8),
                Text(locale.t('purchaseOrder'), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(_poNumber, style: const TextStyle(fontSize: 16, color: AppTheme.primaryBlue, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        _InfoRow(label: locale.locale == 'th' ? 'ลูกค้า' : 'Customer', value: auth.displayName),
        _InfoRow(label: locale.locale == 'th' ? 'บริการ' : 'Service', value: widget.service),
        _InfoRow(label: locale.t('description'), value: widget.description),
        _InfoRow(label: locale.locale == 'th' ? 'พาร์ทเนอร์' : 'Partner', value: _partners[_selectedPartner!]['id']),
        _InfoRow(label: locale.t('tier'), value: _partners[_selectedPartner!]['tier']),
        _InfoRow(label: locale.locale == 'th' ? 'ราคาประมาณ' : 'Est. Price', value: '฿${_partners[_selectedPartner!]['price']}'),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(onPressed: _nextStep, child: Text(locale.locale == 'th' ? 'ดำเนินการต่อ' : locale.locale == 'zh' ? '继续' : 'Proceed')),
        ),
      ],
    );
  }

  Widget _buildNotify(LocaleProvider locale) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(height: 40),
          if (!_partnerConfirmed) ...[
            const SizedBox(width: 50, height: 50, child: CircularProgressIndicator(strokeWidth: 3)),
            const SizedBox(height: 16),
            Text(
              locale.locale == 'th' ? 'กำลังรอพาร์ทเนอร์ยืนยัน...' : locale.locale == 'zh' ? '等待合作伙伴确认...' : 'Waiting for partner confirmation...',
              style: const TextStyle(fontSize: 16),
            ),
          ] else ...[
            const Icon(Icons.check_circle, size: 60, color: AppTheme.success),
            const SizedBox(height: 16),
            Text(
              locale.locale == 'th' ? 'พาร์ทเนอร์ยืนยันแล้ว!' : locale.locale == 'zh' ? '合作伙伴已确认！' : 'Partner Confirmed!',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.success),
            ),
            const SizedBox(height: 24),
            ElevatedButton(onPressed: _nextStep, child: Text(locale.locale == 'th' ? 'ชำระเงิน' : locale.locale == 'zh' ? '去付款' : 'Proceed to Payment')),
          ],
        ],
      ),
    );
  }

  Widget _buildPayment(LocaleProvider locale) {
    final fee = AppConstants.tierFees[_partners[_selectedPartner!]['tier']] ?? 200;
    return Column(
      children: [
        Text(locale.t('payment'), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppTheme.borderLight),
          ),
          child: Column(
            children: [
              Text(locale.t('promptPayQR'), style: const TextStyle(fontSize: 14, color: AppTheme.textSecondary)),
              const SizedBox(height: 16),
              Container(
                width: 200,
                height: 200,
                decoration: BoxDecoration(
                  color: AppTheme.borderLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Center(
                  child: Icon(Icons.qr_code_2, size: 120, color: AppTheme.textMuted),
                ),
              ),
              const SizedBox(height: 16),
              Text('฿$fee', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppTheme.primaryBlue)),
              Text('${locale.t('processingFee')} - ${_partners[_selectedPartner!]['tier']}',
                  style: const TextStyle(color: AppTheme.textSecondary)),
            ],
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () {
              setState(() => _paymentDone = true);
              _nextStep();
            },
            child: Text(locale.locale == 'th' ? 'ชำระเงินแล้ว' : locale.locale == 'zh' ? '已付款' : 'Payment Done'),
          ),
        ),
      ],
    );
  }

  Widget _buildChat(LocaleProvider locale) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Service details panel
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppTheme.primaryBlue.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(locale.locale == 'th' ? 'รายละเอียดบริการ' : locale.locale == 'zh' ? '服务详情' : 'Service Details',
                  style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 4),
              Text('${widget.service}: ${widget.description}', style: const TextStyle(fontSize: 13)),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: AppTheme.success.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              const Icon(Icons.shield, size: 16, color: AppTheme.success),
              const SizedBox(width: 8),
              Text(locale.t('chatAnonymous'), style: const TextStyle(fontSize: 12, color: AppTheme.success)),
            ],
          ),
        ),
        const SizedBox(height: 12),
        // Chat area with send capability
        Container(
          height: 300,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.borderLight),
          ),
          padding: const EdgeInsets.all(12),
          child: Column(
            children: [
              Expanded(
                child: _chatMessages.isEmpty
                    ? Center(
                        child: Text(
                          locale.locale == 'th' ? 'เริ่มแชทกับพาร์ทเนอร์ ${_partners[_selectedPartner!]['id']}'
                              : locale.locale == 'zh' ? '开始与合作伙伴${_partners[_selectedPartner!]['id']}聊天'
                              : 'Start chatting with Partner ${_partners[_selectedPartner!]['id']}',
                          style: const TextStyle(color: AppTheme.textSecondary),
                        ),
                      )
                    : ListView.builder(
                        itemCount: _chatMessages.length,
                        itemBuilder: (_, i) {
                          final msg = _chatMessages[i];
                          final isMine = msg['sender'] == 'me';
                          return Align(
                            alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 6),
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.6),
                              decoration: BoxDecoration(
                                color: isMine ? AppTheme.primaryBlue : Colors.grey.shade200,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(msg['text']!, style: TextStyle(color: isMine ? Colors.white : Colors.black87)),
                            ),
                          );
                        },
                      ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _chatController,
                      decoration: InputDecoration(
                        hintText: locale.locale == 'th' ? 'พิมพ์ข้อความ...' : locale.locale == 'zh' ? '输入消息...' : 'Type a message...',
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(20)),
                      ),
                      onSubmitted: (_) => _sendChatMessage(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.send, color: AppTheme.primaryBlue),
                    onPressed: _sendChatMessage,
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _nextStep,
            child: Text(locale.locale == 'th' ? 'นัดพบ' : locale.locale == 'zh' ? '预约会面' : 'Schedule Meeting'),
          ),
        ),
      ],
    );
  }

  Widget _buildMeeting(LocaleProvider locale) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(locale.t('meeting'), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.borderLight),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _InfoRow(label: locale.t('poNumber'), value: _poNumber),
              _InfoRow(label: 'Partner', value: _partners[_selectedPartner!]['id']),
              _InfoRow(label: locale.t('startDate'),
                  value: '${widget.date.year}-${widget.date.month.toString().padLeft(2, '0')}-${widget.date.day.toString().padLeft(2, '0')}'),
              const SizedBox(height: 12),
              Text(
                locale.locale == 'th' ? '⚠️ ค่าดำเนินการไม่รวมอยู่ในค่างานจริง' : locale.locale == 'zh' ? '⚠️ 手续费不包含在实际工作费中' : '⚠️ Processing fee is separate from work payment',
                style: const TextStyle(fontSize: 12, color: AppTheme.warning),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _nextStep,
            child: Text(locale.locale == 'th' ? 'ยืนยันการนัดพบ' : locale.locale == 'zh' ? '确认会面' : 'Confirm Meeting'),
          ),
        ),
      ],
    );
  }

  Widget _buildVariation(LocaleProvider locale) {
    if (!_hasVariation) return const SizedBox();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(locale.t('variation'), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.warning.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.warning.withValues(alpha: 0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                locale.locale == 'th' ? '📋 งานเพิ่มเติม (Addendum)' : locale.locale == 'zh' ? '📋 附加工作' : '📋 Variation / Addendum',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              Text(
                locale.locale == 'th'
                    ? 'พาร์ทเนอร์เสนองานเพิ่มเติม กรุณาตรวจสอบและอนุมัติ'
                    : locale.locale == 'zh'
                        ? '合作伙伴提出了额外工作，请审核并批准'
                        : 'Partner has proposed additional work. Please review and approve.',
                style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () {
                  setState(() => _variationApproved = false);
                  _nextStep();
                },
                style: OutlinedButton.styleFrom(side: const BorderSide(color: AppTheme.error)),
                child: Text(locale.locale == 'th' ? 'ปฏิเสธ' : locale.locale == 'zh' ? '拒绝' : 'Decline',
                    style: const TextStyle(color: AppTheme.error)),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton(
                onPressed: () {
                  setState(() => _variationApproved = true);
                  _nextStep();
                },
                child: Text(locale.locale == 'th' ? 'อนุมัติ' : locale.locale == 'zh' ? '批准' : 'Approve'),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildComplete(LocaleProvider locale) {
    return Column(
      children: [
        const Icon(Icons.task_alt, size: 60, color: AppTheme.success),
        const SizedBox(height: 16),
        Text(
          locale.locale == 'th' ? 'งานเสร็จสิ้น!' : locale.locale == 'zh' ? '工作完成！' : 'Job Complete!',
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        _InfoRow(label: locale.t('poNumber'), value: _poNumber),
        _InfoRow(label: locale.t('processingFee'), value: '฿${AppConstants.tierFees[_partners[_selectedPartner!]['tier']] ?? 200}'),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _nextStep,
            child: Text(locale.t('rateExperience')),
          ),
        ),
      ],
    );
  }

  Widget _buildRate(LocaleProvider locale) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(locale.t('rateExperience'), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),
        // Customer rating
        Text(locale.locale == 'th' ? 'คะแนนของคุณ:' : locale.locale == 'zh' ? '您的评分:' : 'Your Rating:'),
        const SizedBox(height: 8),
        Row(
          children: List.generate(5, (i) => GestureDetector(
            onTap: () => setState(() => _customerRating = i + 1),
            child: Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Icon(
                Icons.star,
                size: 40,
                color: i < _customerRating ? AppTheme.star : AppTheme.borderLight,
              ),
            ),
          )),
        ),
        const SizedBox(height: 12),
        TextFormField(
          onChanged: (v) => _customerComment = v,
          maxLines: 3,
          decoration: InputDecoration(
            hintText: locale.locale == 'th' ? 'ความคิดเห็น...' : locale.locale == 'zh' ? '评论...' : 'Comment...',
          ),
        ),
        if (_customerRating > 0 && _partnerRating == 0) ...[
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                // Simulate partner rating after 3s
                Future.delayed(const Duration(seconds: 3), () {
                  if (mounted) setState(() => _partnerRating = 3 + Random().nextInt(3));
                });
              },
              child: Text(locale.t('submit')),
            ),
          ),
        ],
        if (_partnerRating > 0) ...[
          const SizedBox(height: 24),
          const Divider(),
          const SizedBox(height: 12),
          Text(locale.locale == 'th' ? 'คะแนนจากพาร์ทเนอร์:' : locale.locale == 'zh' ? '合作伙伴评分:' : 'Partner Rating:'),
          const SizedBox(height: 8),
          Row(
            children: List.generate(5, (i) => Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Icon(Icons.star, size: 40, color: i < _partnerRating ? AppTheme.star : AppTheme.borderLight),
            )),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _nextStep,
              child: Text(locale.t('viewSummary')),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildDone(LocaleProvider locale) {
    return Center(
      child: Column(
        children: [
          const SizedBox(height: 20),
          const Icon(Icons.celebration, size: 60, color: AppTheme.star),
          const SizedBox(height: 16),
          Text(locale.t('done'), style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.borderLight),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _InfoRow(label: locale.t('poNumber'), value: _poNumber),
                _InfoRow(label: 'Partner', value: _partners[_selectedPartner!]['id']),
                _InfoRow(label: locale.locale == 'th' ? 'คะแนนของคุณ' : 'Your Rating', value: '$_customerRating ⭐'),
                _InfoRow(label: locale.locale == 'th' ? 'คะแนนพาร์ทเนอร์' : 'Partner Rating', value: '$_partnerRating ⭐'),
                if (_hasVariation)
                  _InfoRow(label: locale.t('variation'), value: _variationApproved ? '✅ Approved' : '❌ Declined'),
              ],
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => Navigator.of(context).popUntil((route) => route.isFirst),
              child: Text(locale.locale == 'th' ? 'กลับหน้าหลัก' : locale.locale == 'zh' ? '返回首页' : 'Back to Home'),
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _nominationCtrl.dispose();
    super.dispose();
  }
}

class _ProgressBar extends StatelessWidget {
  final int currentStep;
  final int totalSteps;

  const _ProgressBar({required this.currentStep, required this.totalSteps});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(4),
        child: LinearProgressIndicator(
          value: (currentStep + 1) / totalSteps,
          backgroundColor: AppTheme.borderLight,
          valueColor: const AlwaysStoppedAnimation(AppTheme.primaryBlue),
          minHeight: 6,
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(label, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
          ),
          Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13))),
        ],
      ),
    );
  }
}
