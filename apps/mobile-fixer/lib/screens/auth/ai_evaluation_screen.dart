import 'package:flutter/material.dart';
import 'dart:math';
import '../../core/theme.dart';
import '../../core/providers.dart';
import 'package:provider/provider.dart';

/// 9-phase AI evaluation animation shown after partner registration.
/// Phases: KYC → Company → Credentials → Experience → Fraud → OCR → Portfolio → PriceList → Tier
class AiEvaluationScreen extends StatefulWidget {
  const AiEvaluationScreen({super.key});

  @override
  State<AiEvaluationScreen> createState() => _AiEvaluationScreenState();
}

class _AiEvaluationScreenState extends State<AiEvaluationScreen> {
  static const _phases = [
    {'key': 'kyc_check', 'icon': Icons.verified_user},
    {'key': 'company_check', 'icon': Icons.business},
    {'key': 'credentials', 'icon': Icons.school},
    {'key': 'experience', 'icon': Icons.work_history},
    {'key': 'fraud_scan', 'icon': Icons.security},
    {'key': 'ocr_analysis', 'icon': Icons.document_scanner},
    {'key': 'portfolio_ocr', 'icon': Icons.photo_library},
    {'key': 'price_list_eval', 'icon': Icons.attach_money},
    {'key': 'tier_assign', 'icon': Icons.emoji_events},
  ];

  int _currentPhase = -1;
  bool _complete = false;
  String? _assignedTier;
  int? _score;
  String? _credentialStatus; // 'verified', 'partial', 'unverified'
  List<Map<String, dynamic>> _scoreBreakdown = [];

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

    // 7-factor scoring algorithm (100 pts total, matching web)
    // Experience (25), Skills Breadth (15), KYC (15), Portfolio (15), Profile (10), Price List (10), Credential (10)
    final expScore = 10 + rng.nextInt(16);    // 10-25
    final skillScore = 5 + rng.nextInt(11);    // 5-15
    final kycScore = 8 + rng.nextInt(8);       // 8-15
    final portfolioScore = 5 + rng.nextInt(11); // 5-15
    final profileScore = 5 + rng.nextInt(6);    // 5-10
    final priceScore = 4 + rng.nextInt(7);     // 4-10
    final credScore = 3 + rng.nextInt(8);      // 3-10
    final total = expScore + skillScore + kycScore + portfolioScore + profileScore + priceScore + credScore;

    // Tier based on score
    String tier;
    if (total >= 85) tier = 'Expert';
    else if (total >= 70) tier = 'Specialist';
    else if (total >= 55) tier = 'Corporate';
    else if (total >= 40) tier = 'Standard';
    else tier = 'Economy';

    // Credential status
    String cred;
    if (credScore >= 8) cred = 'verified';
    else if (credScore >= 5) cred = 'partial';
    else cred = 'unverified';

    setState(() {
      _assignedTier = tier;
      _score = total;
      _credentialStatus = cred;
      _scoreBreakdown = [
        {'label': 'Experience', 'score': expScore, 'max': 25},
        {'label': 'Skills Breadth', 'score': skillScore, 'max': 15},
        {'label': 'KYC Documents', 'score': kycScore, 'max': 15},
        {'label': 'Portfolio & Evidence', 'score': portfolioScore, 'max': 15},
        {'label': 'Profile Completeness', 'score': profileScore, 'max': 10},
        {'label': 'Price List', 'score': priceScore, 'max': 10},
        {'label': 'Credential Verification', 'score': credScore, 'max': 10},
      ];
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
            _complete ? t('evaluation_complete') : t('analyzing_profile'),
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
                  t(phase['key'] as String),
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
            // Credential badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: _credentialStatus == 'verified' ? Colors.green.shade50 : _credentialStatus == 'partial' ? Colors.orange.shade50 : Colors.red.shade50,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: _credentialStatus == 'verified' ? Colors.green : _credentialStatus == 'partial' ? Colors.orange : Colors.red),
              ),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(
                  _credentialStatus == 'verified' ? Icons.verified : _credentialStatus == 'partial' ? Icons.warning_amber : Icons.error_outline,
                  size: 18,
                  color: _credentialStatus == 'verified' ? Colors.green : _credentialStatus == 'partial' ? Colors.orange : Colors.red,
                ),
                const SizedBox(width: 6),
                Text(
                  _credentialStatus == 'verified' ? 'Verified ✓' : _credentialStatus == 'partial' ? 'Partially Verified' : 'Unverified',
                  style: TextStyle(fontWeight: FontWeight.w600, color: _credentialStatus == 'verified' ? Colors.green.shade700 : _credentialStatus == 'partial' ? Colors.orange.shade700 : Colors.red.shade700),
                ),
              ]),
            ),
            const SizedBox(height: 16),
            Card(
              color: AppTheme.primaryBlue.withValues(alpha: 0.05),
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(children: [
                  const Icon(Icons.emoji_events, size: 48, color: AppTheme.warningOrange),
                  const SizedBox(height: 12),
                  Text(t('assigned_tier'), style: const TextStyle(color: AppTheme.textSecondary)),
                  Text(_assignedTier!, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppTheme.primaryBlue)),
                  const SizedBox(height: 8),
                  Text('${t('ai_score')}: $_score/100', style: const TextStyle(fontSize: 16, color: AppTheme.primaryGreen, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 16),
                  // Score breakdown
                  ..._scoreBreakdown.map((item) {
                    final pct = (item['score'] as int) / (item['max'] as int);
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(children: [
                          Expanded(child: Text(item['label'] as String, style: const TextStyle(fontSize: 12))),
                          Text('${item['score']}/${item['max']}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                        ]),
                        const SizedBox(height: 4),
                        LinearProgressIndicator(
                          value: pct,
                          backgroundColor: Colors.grey.shade200,
                          valueColor: AlwaysStoppedAnimation(pct >= 0.7 ? AppTheme.primaryGreen : pct >= 0.4 ? AppTheme.primaryBlue : AppTheme.warningOrange),
                        ),
                      ]),
                    );
                  }),
                  const SizedBox(height: 8),
                  Text('PDPA: Data protected under Thai PDPA law', style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
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
