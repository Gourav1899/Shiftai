import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'providers/auth_provider.dart';
import 'providers/booking_provider.dart';
import 'providers/tracking_provider.dart';

import 'screens/auth/login_screen.dart';
import 'screens/auth/otp_screen.dart';
import 'screens/customer/home_screen.dart';
import 'screens/customer/book_screen.dart';
import 'screens/customer/track_screen.dart';
import 'screens/customer/orders_screen.dart';
import 'screens/customer/profile_screen.dart';
import 'screens/driver/driver_home_screen.dart';
import 'screens/driver/driver_job_screen.dart';
import 'screens/admin/admin_dashboard_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
  ));
  final prefs = await SharedPreferences.getInstance();
  runApp(ShiftEaseApp(prefs: prefs));
}

class ShiftEaseApp extends StatelessWidget {
  final SharedPreferences prefs;
  const ShiftEaseApp({super.key, required this.prefs});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider(prefs)),
        ChangeNotifierProvider(create: (_) => BookingProvider()),
        ChangeNotifierProvider(create: (_) => TrackingProvider()),
      ],
      child: Consumer<AuthProvider>(
        builder: (context, auth, _) {
          return MaterialApp(
            title: 'ShiftEase',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.light,
            // Route based on role
            home: auth.isLoggedIn ? _homeForRole(auth.user?.role) : const LoginScreen(),
            routes: {
              '/login':        (_) => const LoginScreen(),
              '/otp':          (_) => const OtpScreen(),
              '/home':         (_) => const CustomerHomeScreen(),
              '/book':         (_) => const BookScreen(),
              '/orders':       (_) => const OrdersScreen(),
              '/profile':      (_) => const ProfileScreen(),
              '/driver':       (_) => const DriverHomeScreen(),
              '/admin':        (_) => const AdminDashboardScreen(),
            },
            onGenerateRoute: (settings) {
              if (settings.name == '/track') {
                final bookingId = settings.arguments as String;
                return MaterialPageRoute(builder: (_) => TrackScreen(bookingId: bookingId));
              }
              if (settings.name == '/driver-job') {
                final bookingId = settings.arguments as String;
                return MaterialPageRoute(builder: (_) => DriverJobScreen(bookingId: bookingId));
              }
              return null;
            },
          );
        },
      ),
    );
  }

  Widget _homeForRole(String? role) {
    switch (role) {
      case 'driver':      return const DriverHomeScreen();
      case 'admin':
      case 'tenant_admin':return const AdminDashboardScreen();
      default:            return const CustomerHomeScreen();
    }
  }
}

// ─── App Theme ─────────────────────────────────────────
class AppTheme {
  static const Color black   = Color(0xFF0D0D0D);
  static const Color white   = Color(0xFFFFFFFF);
  static const Color bg      = Color(0xFFF5F5F5);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color border  = Color(0xFFE0E0E0);
  static const Color accent  = Color(0xFFC8F000);
  static const Color accentDk= Color(0xFFA8CC00);
  static const Color txt     = Color(0xFF111111);
  static const Color txt2    = Color(0xFF666666);
  static const Color txt3    = Color(0xFF999999);
  static const Color green   = Color(0xFF16A34A);
  static const Color red     = Color(0xFFDC2626);
  static const Color orange  = Color(0xFFEA580C);
  static const Color blue    = Color(0xFF2563EB);

  static ThemeData get light => ThemeData(
    useMaterial3: true,
    scaffoldBackgroundColor: bg,
    colorScheme: const ColorScheme.light(
      primary: black, secondary: accent,
      surface: surface, background: bg,
      onPrimary: white, onSurface: txt,
    ),
    fontFamily: 'Roboto',
    appBarTheme: const AppBarTheme(
      backgroundColor: white, elevation: 0,
      iconTheme: IconThemeData(color: txt),
      titleTextStyle: TextStyle(color: txt, fontSize: 17, fontWeight: FontWeight.w600),
      systemOverlayStyle: SystemUiOverlayStyle(statusBarIconBrightness: Brightness.dark),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: black, foregroundColor: white,
        minimumSize: const Size(double.infinity, 52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        elevation: 0,
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true, fillColor: surface,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: border)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: border)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: black, width: 1.5)),
      hintStyle: const TextStyle(color: txt3, fontSize: 14),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
    ),
    cardTheme: CardTheme(
      color: surface, elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: const BorderSide(color: border)),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: white, selectedItemColor: black,
      unselectedItemColor: txt3, elevation: 0,
      type: BottomNavigationBarType.fixed,
    ),
  );
}
