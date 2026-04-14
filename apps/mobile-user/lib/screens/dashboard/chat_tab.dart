import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../core/providers.dart';

class ChatTab extends StatefulWidget {
  final bool standalone;
  const ChatTab({super.key, this.standalone = false});

  @override
  State<ChatTab> createState() => _ChatTabState();
}

class _ChatTabState extends State<ChatTab> {
  int? _selectedChat;
  final _msgController = TextEditingController();
  final List<Map<String, dynamic>> _extraMessages = [];

  void _sendMessage() {
    final text = _msgController.text.trim();
    if (text.isEmpty || _selectedChat == null) return;
    final now = TimeOfDay.now();
    setState(() {
      _extraMessages.add({'chatIdx': _selectedChat, 'text': text, 'time': '${now.hour}:${now.minute.toString().padLeft(2, '0')}'});
    });
    _msgController.clear();
  }

  static final List<Map<String, dynamic>> _demoChats = [
    {
      'name': 'Partner FIX-1042',
      'service': {'en': 'AC Repair', 'th': 'ซ่อมแอร์', 'zh': '空调维修'},
      'lastMsg': {'en': 'I will arrive at 2 PM tomorrow', 'th': 'จะไปถึง บ่าย 2 พรุ่งนี้', 'zh': '我明天下午2点到'},
      'time': {'en': '2m ago', 'th': '2 นาทีที่ผ่านมา', 'zh': '2分钟前'},
      'unread': 2,
      'online': true,
    },
    {
      'name': 'Partner PRO-0221',
      'service': {'en': 'Interior Design', 'th': 'ออกแบบภายใน', 'zh': '室内设计'},
      'lastMsg': {'en': 'Please share the floor plan', 'th': 'กรุณาส่งแปลนชั้น', 'zh': '请分享平面图'},
      'time': {'en': '1h ago', 'th': '1 ชั่วโมงที่ผ่านมา', 'zh': '1小时前'},
      'unread': 0,
      'online': true,
    },
    {
      'name': 'Lister LST-0102',
      'service': {'en': 'Condo Sukhumvit', 'th': 'คอนโดสุขุมวิท', 'zh': '素坤逸公寓'},
      'lastMsg': {'en': 'Available for viewing on Saturday', 'th': 'ดูได้วันเสาร์', 'zh': '周六可以看房'},
      'time': {'en': '3h ago', 'th': '3 ชั่วโมงที่ผ่านมา', 'zh': '3小时前'},
      'unread': 1,
      'online': false,
    },
    {
      'name': 'Partner FIX-0983',
      'service': {'en': 'Plumbing Fix', 'th': 'ซ่อมท่อน้ำ', 'zh': '水管维修'},
      'lastMsg': {'en': 'Work completed, please check', 'th': 'งานเสร็จแล้วครับ ตรวจสอบด้วย', 'zh': '工作完成，请检查'},
      'time': {'en': '1d ago', 'th': '1 วันที่ผ่านมา', 'zh': '1天前'},
      'unread': 0,
      'online': false,
    },
  ];

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();

    if (_selectedChat != null) {
      return _buildChatView(locale);
    }

    return Column(
      children: [
        // Safety notice
        Container(
          margin: const EdgeInsets.all(16),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppTheme.primaryBlue.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AppTheme.primaryBlue.withValues(alpha: 0.2)),
          ),
          child: Row(
            children: [
              const Icon(Icons.shield, size: 16, color: AppTheme.primaryBlue),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  locale.t('chatAnonymous'),
                  style: const TextStyle(fontSize: 12, color: AppTheme.primaryBlue),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView.builder(
            itemCount: _demoChats.length,
            itemBuilder: (context, i) {
              final chat = _demoChats[i];
              final service = chat['service'] as Map<String, String>;
              final lastMsg = chat['lastMsg'] as Map<String, String>;
              final time = chat['time'] as Map<String, String>;

              return ListTile(
                onTap: () => setState(() => _selectedChat = i),
                leading: Stack(
                  children: [
                    CircleAvatar(
                      backgroundColor: AppTheme.primaryBlue.withValues(alpha: 0.1),
                      child: const Icon(Icons.person, color: AppTheme.primaryBlue),
                    ),
                    if (chat['online'] == true)
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: Container(
                          width: 12,
                          height: 12,
                          decoration: BoxDecoration(
                            color: AppTheme.success,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2),
                          ),
                        ),
                      ),
                  ],
                ),
                title: Text(chat['name'], style: const TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      service[locale.locale] ?? service['en']!,
                      style: const TextStyle(fontSize: 11, color: AppTheme.primaryBlue),
                    ),
                    Text(
                      lastMsg[locale.locale] ?? lastMsg['en']!,
                      style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
                trailing: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      time[locale.locale] ?? time['en']!,
                      style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                    ),
                    if ((chat['unread'] as int) > 0)
                      Container(
                        margin: const EdgeInsets.only(top: 4),
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryBlue,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          '${chat['unread']}',
                          style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                        ),
                      ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildChatView(LocaleProvider locale) {
    final chat = _demoChats[_selectedChat!];
    final service = chat['service'] as Map<String, String>;

    return Column(
      children: [
        // Chat header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          color: Colors.white,
          child: Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => setState(() => _selectedChat = null),
              ),
              CircleAvatar(
                radius: 18,
                backgroundColor: AppTheme.primaryBlue.withValues(alpha: 0.1),
                child: const Icon(Icons.person, size: 18, color: AppTheme.primaryBlue),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(chat['name'], style: const TextStyle(fontWeight: FontWeight.w600)),
                    Text(service[locale.locale] ?? service['en']!, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                  ],
                ),
              ),
            ],
          ),
        ),
        const Divider(height: 1),
        // Messages area
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _ChatBubble(
                text: locale.locale == 'th' ? 'สวัสดีครับ ขอสอบถามเรื่องงาน' : locale.locale == 'zh' ? '你好，想咨询工作事宜' : 'Hello, I want to ask about the job',
                isMine: true,
                time: '10:00',
              ),
              _ChatBubble(
                text: (chat['lastMsg'] as Map<String, String>)[locale.locale] ?? (chat['lastMsg'] as Map<String, String>)['en']!,
                isMine: false,
                time: '10:02',
              ),
              ..._extraMessages
                  .where((m) => m['chatIdx'] == _selectedChat)
                  .map((m) => _ChatBubble(text: m['text'] as String, isMine: true, time: m['time'] as String)),
            ],
          ),
        ),
        // Input
        Container(
          padding: const EdgeInsets.all(12),
          color: Colors.white,
          child: Row(
            children: [
              IconButton(icon: const Icon(Icons.attach_file), onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('File sharing coming soon'), duration: Duration(seconds: 2)),
                );
              }),
              Expanded(
                child: TextField(
                  controller: _msgController,
                  decoration: InputDecoration(
                    hintText: locale.locale == 'th' ? 'พิมพ์ข้อความ...' : locale.locale == 'zh' ? '输入消息...' : 'Type a message...',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(24)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  ),
                  onSubmitted: (_) => _sendMessage(),
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                icon: const Icon(Icons.send, color: AppTheme.primaryBlue),
                onPressed: _sendMessage,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ChatBubble extends StatelessWidget {
  final String text;
  final bool isMine;
  final String time;

  const _ChatBubble({required this.text, required this.isMine, required this.time});

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        decoration: BoxDecoration(
          color: isMine ? AppTheme.primaryBlue : Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isMine ? 16 : 4),
            bottomRight: Radius.circular(isMine ? 4 : 16),
          ),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(text, style: TextStyle(color: isMine ? Colors.white : AppTheme.textPrimary)),
            const SizedBox(height: 4),
            Text(time, style: TextStyle(fontSize: 10, color: isMine ? Colors.white70 : AppTheme.textMuted)),
          ],
        ),
      ),
    );
  }
}
