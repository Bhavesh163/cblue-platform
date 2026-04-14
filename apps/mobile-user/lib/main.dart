import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme.dart';
import 'core/providers.dart';
import 'screens/shell.dart';
import 'screens/auth/login_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const CblueCustomerApp());
}

class CblueCustomerApp extends StatelessWidget {
  const CblueCustomerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => LocaleProvider()..init()),
        ChangeNotifierProvider(create: (_) => AuthProvider()..init()),
      ],
      child: Consumer<LocaleProvider>(
        builder: (context, localeProv, _) => MaterialApp(
          title: 'CBLUE Customer',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.lightTheme,
          home: Consumer<AuthProvider>(
            builder: (context, auth, _) =>
                auth.isLoggedIn ? const AppShell() : const LoginScreen(),
          ),
        ),
      ),
    );
  }
}
