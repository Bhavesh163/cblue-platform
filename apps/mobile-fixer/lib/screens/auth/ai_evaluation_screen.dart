import 'package:flutter/material.dart';
import 'dart:math';
import '../../core/theme.dart';
import '../../core/providers.dart';
import 'package:provider/provider.dart';

/// 8-phase AI evaluation animation shown after partner registration.
/// Phases: KYC → Company → Credentials → Experience → Fraud → Portfolio → PriceList → Tier
class AiEvaluationScreen extends StatefulWidget {
  const AiEvaluationScreen({super.key});

  @override
  State<AiEvaluationScreen> createState() => _AiEvaluationScreenState();
}

class _AiEvaluationScreenState extends State<AiEvaluationScreen> {
  static const _phases = [
    {'key': 'kyc_check', 'icon': Icons.verified_user, 'label': 'KYC Verification'},
    {'key': 'company_check', 'icon': Icons.business, 'label': 'Company Validation'},
    {'key': 'credentials', 'icon': Icons.school, 'label': 'Credentials Analysis'},
    {'key': 'experience', 'icon': Icons.work_history, 'label': 'Experience Assessment'},
    {'key': 'fraud_scan', 'icon': Icons.security, 'label': 'Fraud Detection Scan'},
    {'key': 'portfolio', 'icon': Icons.photo_library, 'label': 'Portfolio OCR & Analysis'},
    {'key': 'price_list', 'icon': Icons.attach_money, 'label': 'Price List Evaluation'},
    {'key': 'tier_assign', 'icon': Icons.emoji_events, 'label': 'Tier Assignment'},
  ];

  int _currentPhase = -1;
  bool _complete = false;
  String? _assignedTier;
  int? _score;

  @override
  void initState() {
    super.initState();
    _runEvaluation();
  }

  Future<void> _runEvaluation() async {
    final rng = Random();
    for (int i = 0; i < _phases.length; i++) {
      await Future.delayed(Duration(milliseconds: 800 + rng.nextInt(600)));
      if (!mounted) return;
      setState(() => _currentPhase = i);
    }
    await Future.delayed(const Duration(milliseconds: 500));
    if (!mounted) return;

    // Simulate tier assignment
    final tiers = ['Economy', 'Standard', 'Upper', 'Luxury', 'Grandeur'];
    final tierIndex = 1 + rng.nextInt(3); // Standard to Luxury
    setState(() {
      _assignedTier = tiers[tierIndex];
      _score = 60 + rng.nextInt(35);
      _complete = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    final t = context.watch<LocaleProvider>().t;

    return Scaffold(
      appBar: AppBar(title: Text(t('ai_evaluation'))),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(children: [
          // Header
          const Icon(Icons.psychology, size: 56, color: AppTheme.primaryBlue),
          const SizedBox(height: 12),
          Text(t('ai_evaluation'), style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text(
            _complete ? 'Evaluation complete' : 'Analyzing your profile...',
            style: const TextStyle(color: AppTheme.textSecondary),
          ),
          const SizedBox(height: 8),
          // Progress bar
          LinearProgressIndicator(
            value: _complete ? 1.0 : (_currentPhase + 1) / _phases.length,
            backgroundColor: AppTheme.surfaceGrey,
            valueColor: AlwaysStoppedAnimation(_complete ? AppTheme.primaryGreen : AppTheme.primaryBlue),
          ),
          const SizedBox(height: 24),

          // Phase list
          ...List.generate(_phases.length, (i) {
            final phase = _phases[i];
            final done = i <= _currentPhase;
            final active = i == _currentPhase && !_complete;
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: done ? AppTheme.primaryGreen.withValues(alpha: 0.06) : AppTheme.surfaceGrey,
                borderRadius: BorderRadius.circular(10),
                border: active ? Border.all(color: AppTheme.primaryBlue, width: 1.5) : null,
              ),
              child: Row(children: [
                Icon(
                  phase['icon'] as IconData,
                  size: 22,
                  color: done ? AppTheme.primaryGreen : AppTheme.textSecondary,
                ),
                const SizedBox(width: 12),
                Expanded(child: Text(
                  phase['label'] as String,
                  style: TextStyle(
                    fontWeight: active ? FontWeight.bold : FontWeight.normal,
                    color: done ? AppTheme.textPrimary : AppTheme.textSecondary,
                  ),
                )),
                if (done && !active)
                  const Icon(Icons.check_circle, size: 20, color: AppTheme.primaryGreen)
                else if (active)
                  const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
              ]),
            );
          }),

          // Result card
          if (_complete) ...[
            const SizedBox(height: 20),
            Card(
              color: AppTheme.primaryBlue.withValues(alpha: 0.05),
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(children: [
                  const Icon(Icons.emoji_events, size: 48, color: AppTheme.warningOrange),
                  const SizedBox(height: 12),
                  Text('Assigned Tier', style: const TextStyle(color: AppTheme.textSecondary)),
                  Text(_assignedTier!, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppTheme.primaryBlue)),
                  const SizedBox(height: 8),
                  Text('AI Score: $_score/100', style: const TextStyle(fontSize: 16, color: AppTheme.primaryGreen, fontWeight: FontWeight.w600)),
                ]),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.of(context).popUntil((r) => r.isFirst),
                style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                child: Text(t('go_to_dashboard'), style: const TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ]),
      ),
    );
  }
}
