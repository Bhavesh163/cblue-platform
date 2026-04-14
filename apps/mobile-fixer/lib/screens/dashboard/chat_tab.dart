import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/providers.dart';
import '../../core/theme.dart';

class ChatTab extends StatefulWidget {
  const ChatTab({super.key});

  @override
  State<ChatTab> createState() => _ChatTabState();
}

class _ChatTabState extends State<ChatTab> {
  int? _openChat;
  final _msgController = TextEditingController();
  final List<List<Map<String, String>>> _chatMessages = [];

  final _conversations = [
    {'name': 'Customer #C1032', 'lastMsg': {'en': 'When can you start the plumbing work?', 'th': 'เริ่มงานท่อน้ำได้เมื่อไหร่คะ?', 'zh': '什么时候可以开始水管工作？'}, 'time': {'en': '10:32 AM', 'th': '10:32', 'zh': '10:32'}, 'unread': 2, 'online': true},
    {'name': 'Customer #C0998', 'lastMsg': {'en': 'I confirmed the schedule. See you then!', 'th': 'ยืนยันนัดหมายแล้วค่ะ แล้วพบกัน!', 'zh': '已确认日程，到时见！'}, 'time': {'en': 'Yesterday', 'th': 'เมื่อวาน', 'zh': '昨天'}, 'unread': 0, 'online': false},
    {'name': 'Customer #C1001', 'lastMsg': {'en': 'Thanks for the great work! 👍', 'th': 'ขอบคุณสำหรับงานที่ดีครับ 👍', 'zh': '感谢出色的工作！👍'}, 'time': {'en': '2 days ago', 'th': '2 วันที่แล้ว', 'zh': '2天前'}, 'unread': 0, 'online': true},
    {'name': 'CBLUE Support', 'lastMsg': {'en': 'Your tier upgrade is approved.', 'th': 'อนุมัติอัพเกรดระดับแล้ว', 'zh': '您的等级升级已批准'}, 'time': {'en': '3 days ago', 'th': '3 วันที่แล้ว', 'zh': '3天前'}, 'unread': 1, 'online': true},
  ];

  @override
  void initState() {
    super.initState();
    // Initialize message history for each conversation
    _chatMessages.addAll([
      [
        {'from': 'customer', 'text': 'When can you start the plumbing work?', 'time': '10:32 AM'},
        {'from': 'me', 'text': 'I can come tomorrow morning at 9 AM. Will that work?', 'time': '10:35 AM'},
        {'from': 'customer', 'text': 'Perfect! See you then.', 'time': '10:36 AM'},
      ],
      [
        {'from': 'customer', 'text': 'I confirmed the schedule. See you then!', 'time': 'Yesterday'},
      ],
      [
        {'from': 'customer', 'text': 'Thanks for the great work! 👍', 'time': '2 days ago'},
      ],
      [
        {'from': 'system', 'text': 'Your tier upgrade is approved.', 'time': '3 days ago'},
      ],
    ]);
  }

  void _sendMessage() {
    final text = _msgController.text.trim();
    if (text.isEmpty || _openChat == null) return;
    final now = TimeOfDay.now();
    final timeStr = '${now.hour}:${now.minute.toString().padLeft(2, '0')}';
    setState(() {
      _chatMessages[_openChat!].add({'from': 'me', 'text': text, 'time': timeStr});
      _conversations[_openChat!]['lastMsg'] = text;
      _conversations[_openChat!]['time'] = timeStr;
    });
    _msgController.clear();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.watch<LocaleProvider>().t;
    final locale = context.watch<LocaleProvider>().locale;

    return Column(children: [
      Container(
        padding: const EdgeInsets.all(12),
        margin: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppTheme.warningOrange.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(children: [
          const Icon(Icons.security, size: 18, color: AppTheme.warningOrange),
          const SizedBox(width: 8),
          Expanded(child: Text(t('anonymous_chat_notice'), style: const TextStyle(fontSize: 12, color: AppTheme.warningOrange))),
        ]),
      ),
      Expanded(
        child: ListView.builder(
          itemCount: _conversations.length,
          itemBuilder: (_, i) {
            final c = _conversations[i];
            final unread = c['unread'] as int;
            return ListTile(
              leading: Stack(children: [
                CircleAvatar(backgroundColor: AppTheme.primaryGreen.withValues(alpha: 0.2), child: Text((c['name'] as String).substring(0, 2), style: const TextStyle(fontWeight: FontWeight.bold))),
                if (c['online'] == true)
                  Positioned(bottom: 0, right: 0, child: Container(width: 12, height: 12, decoration: BoxDecoration(color: AppTheme.primaryGreen, shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 2)))),
              ]),
              title: Text(c['name'] as String, style: TextStyle(fontWeight: unread > 0 ? FontWeight.bold : FontWeight.normal)),
              subtitle: Text(c['lastMsg'] is Map ? ((c['lastMsg'] as Map)[locale] ?? (c['lastMsg'] as Map)['en']) : c['lastMsg'] as String, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 13, color: unread > 0 ? AppTheme.textPrimary : AppTheme.textSecondary)),
              trailing: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Text(c['time'] is Map ? ((c['time'] as Map)[locale] ?? (c['time'] as Map)['en']) : c['time'] as String, style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                if (unread > 0) ...[
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: const BoxDecoration(color: AppTheme.primaryGreen, shape: BoxShape.rectangle, borderRadius: BorderRadius.all(Radius.circular(10))),
                    child: Text('$unread', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                  ),
                ],
              ]),
              onTap: () => setState(() {
                _openChat = i;
                _conversations[i]['unread'] = 0;
              }),
            );
          },
        ),
      ),
    ]);
  }

  Widget _chatView(String Function(String) t) {
    final conv = _conversations[_openChat!];
    final messages = _chatMessages[_openChat!];

    return Column(children: [
      // Header
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        color: AppTheme.surfaceGrey,
        child: Row(children: [
          IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => setState(() => _openChat = null)),
          CircleAvatar(radius: 16, backgroundColor: AppTheme.primaryGreen.withValues(alpha: 0.2), child: Text((conv['name'] as String).substring(0, 2), style: const TextStyle(fontSize: 12))),
          const SizedBox(width: 8),
          Text(conv['name'] as String, style: const TextStyle(fontWeight: FontWeight.bold)),
        ]),
      ),
      // Messages
      Expanded(
        child: ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: messages.length,
          itemBuilder: (_, i) {
            final m = messages[i];
            final isMe = m['from'] == 'me';
            return Align(
              alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
              child: Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                decoration: BoxDecoration(
                  color: isMe ? AppTheme.primaryGreen : AppTheme.surfaceGrey,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  Text(m['text']!, style: TextStyle(color: isMe ? Colors.white : AppTheme.textPrimary)),
                  const SizedBox(height: 2),
                  Text(m['time']!, style: TextStyle(fontSize: 10, color: isMe ? Colors.white70 : AppTheme.textSecondary)),
                ]),
              ),
            );
          },
        ),
      ),
      // Input
      Container(
        padding: const EdgeInsets.all(12),
        color: Colors.white,
        child: Row(children: [
          IconButton(icon: const Icon(Icons.attach_file), onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(t('file_sharing_soon')), duration: const Duration(seconds: 2)),
            );
          }),
          Expanded(
            child: TextField(
              controller: _msgController,
              decoration: InputDecoration(hintText: '${t('chat')}...', isDense: true, contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10)),
              onSubmitted: (_) => _sendMessage(),
            ),
          ),
          const SizedBox(width: 8),
          CircleAvatar(
            backgroundColor: AppTheme.primaryGreen,
            child: IconButton(icon: const Icon(Icons.send, color: Colors.white, size: 18), onPressed: _sendMessage),
          ),
        ]),
      ),
    ]);
  }
}
