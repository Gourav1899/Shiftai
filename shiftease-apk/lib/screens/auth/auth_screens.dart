// ─── lib/screens/auth/login_screen.dart ───────────────
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../main.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phoneCtrl = TextEditingController();
  bool _sending = false;

  Future<void> _sendOtp() async {
    final phone = _phoneCtrl.text.trim();
    if (phone.length < 10) { _snack('Enter valid 10-digit number'); return; }
    setState(() => _sending = true);
    final auth   = context.read<AuthProvider>();
    final result = await auth.sendOtp(phone);
    setState(() => _sending = false);
    if (result['success'] == true) {
      if (!mounted) return;
      Navigator.pushNamed(context, '/otp', arguments: phone);
    } else {
      _snack(result['message'] ?? 'Failed to send OTP');
    }
  }

  void _snack(String msg) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 48),
              // Logo
              const Text('ShiftEase', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: -.5, color: AppTheme.black)),
              const SizedBox(height: 8),
              const Text('Smart Movers & Packers', style: TextStyle(fontSize: 14, color: AppTheme.txt3)),
              const SizedBox(height: 56),
              const Text('Enter your phone', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppTheme.black)),
              const SizedBox(height: 8),
              const Text("We'll send you a one-time password", style: TextStyle(fontSize: 14, color: AppTheme.txt2)),
              const SizedBox(height: 32),
              // Phone input
              TextField(
                controller: _phoneCtrl,
                keyboardType: TextInputType.phone,
                maxLength: 10,
                decoration: const InputDecoration(
                  hintText: '98765 43210',
                  prefixText: '+91  ',
                  counterText: '',
                  prefixStyle: TextStyle(color: AppTheme.txt, fontWeight: FontWeight.w500),
                ),
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w500, letterSpacing: 1.5),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _sending ? null : _sendOtp,
                child: _sending
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Send OTP', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
              ),
              const Spacer(),
              Center(child: Text('By continuing, you agree to our Terms of Service', style: TextStyle(fontSize: 12, color: AppTheme.txt3))),
            ],
          ),
        ),
      ),
    );
  }
}


// ─── lib/screens/auth/otp_screen.dart ─────────────────
import 'package:pinput/pinput.dart';

class OtpScreen extends StatefulWidget {
  const OtpScreen({super.key});
  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  String _otp = '';
  final _nameCtrl = TextEditingController();
  bool _verifying = false;
  bool _isNewUser = false;

  Future<void> _verify() async {
    final phone = ModalRoute.of(context)!.settings.arguments as String? ?? '';
    if (_otp.length < 6) { _snack('Enter 6-digit OTP'); return; }
    setState(() => _verifying = true);
    final auth   = context.read<AuthProvider>();
    final result = await auth.verifyOtp(phone, _otp, name: _nameCtrl.text.trim().isEmpty ? null : _nameCtrl.text.trim());
    setState(() => _verifying = false);
    if (result['success'] == true) {
      if (!mounted) return;
      final role = auth.user?.role ?? 'customer';
      if (role == 'driver')             Navigator.pushReplacementNamed(context, '/driver');
      else if (role == 'admin' || role == 'tenant_admin') Navigator.pushReplacementNamed(context, '/admin');
      else                              Navigator.pushReplacementNamed(context, '/home');
    } else {
      _snack(result['message'] ?? 'Invalid OTP');
    }
  }

  void _snack(String msg) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));

  @override
  Widget build(BuildContext context) {
    final phone = ModalRoute.of(context)!.settings.arguments as String? ?? '';
    final theme = PinTheme(
      width: 52, height: 56,
      textStyle: const TextStyle(fontSize: 22, fontWeight: FontWeight.w600, color: AppTheme.black),
      decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppTheme.border)),
    );
    return Scaffold(
      backgroundColor: AppTheme.white,
      appBar: AppBar(backgroundColor: AppTheme.white, elevation: 0),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Verify OTP', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppTheme.black)),
            const SizedBox(height: 8),
            Text('Sent to +91 $phone', style: const TextStyle(fontSize: 14, color: AppTheme.txt2)),
            const SizedBox(height: 36),
            Pinput(
              length: 6,
              defaultPinTheme: theme,
              focusedPinTheme: theme.copyDecorationWith(border: Border.all(color: AppTheme.black, width: 1.5)),
              onChanged: (v) => setState(() => _otp = v),
              onCompleted: (v) { _otp = v; if (!_isNewUser) _verify(); },
              autofocus: true,
            ),
            if (_isNewUser) ...[
              const SizedBox(height: 24),
              const Text('Your name', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.txt2)),
              const SizedBox(height: 8),
              TextField(
                controller: _nameCtrl,
                decoration: const InputDecoration(hintText: 'Enter your full name'),
                textCapitalization: TextCapitalization.words,
              ),
            ],
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: _verifying ? null : _verify,
              child: _verifying
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Verify & Continue', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      ),
    );
  }
}
