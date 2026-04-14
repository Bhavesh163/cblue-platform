import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme.dart';
import 'core/providers.dart';
import 'screens/shell.dart';
import 'screens/auth/login_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => LocaleProvider()),
        ChangeNotifierProvider(create: (_) => AuthProvider()),
      ],
      child: const CbluePartnerApp(),
    ),
  );
}

class CbluePartnerApp extends StatelessWidget {
  const CbluePartnerApp({super.key});

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    return MaterialApp(
      title: locale.t('app_title'),
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: Consumer<AuthProvider>(
        builder: (_, auth, __) =>
            auth.isLoggedIn ? const AppShell() : const LoginScreen(),
      ),
    );
  }
}
