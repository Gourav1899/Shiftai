// ─── lib/providers/auth_provider.dart ─────────────────
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

class UserModel {
  final String id, name, phone, role;
  const UserModel({required this.id, required this.name, required this.phone, required this.role});
  factory UserModel.fromJson(Map<String, dynamic> j) => UserModel(
    id: j['id'] ?? '', name: j['name'] ?? '', phone: j['phone'] ?? '', role: j['role'] ?? 'customer',
  );
  Map<String, dynamic> toJson() => {'id': id, 'name': name, 'phone': phone, 'role': role};
}

class AuthProvider extends ChangeNotifier {
  final SharedPreferences _prefs;
  UserModel? _user;
  String?   _token;
  bool      _loading = false;

  AuthProvider(this._prefs) { _load(); }

  UserModel? get user     => _user;
  String?    get token    => _token;
  bool       get loading  => _loading;
  bool       get isLoggedIn => _token != null && _user != null;

  void _load() {
    _token = _prefs.getString('token');
    final u = _prefs.getString('user');
    if (u != null) _user = UserModel.fromJson(jsonDecode(u));
  }

  Future<Map<String, dynamic>> sendOtp(String phone) async {
    _loading = true; notifyListeners();
    try { return await AuthApi.sendOtp(phone); }
    catch (e) { return {'success': false, 'message': e.toString()}; }
    finally { _loading = false; notifyListeners(); }
  }

  Future<Map<String, dynamic>> verifyOtp(String phone, String otp, {String? name}) async {
    _loading = true; notifyListeners();
    try {
      final data = await AuthApi.verifyOtp(phone, otp, name: name);
      if (data['success'] == true) {
        _token = data['token'];
        _user  = UserModel.fromJson(data['user']);
        await _prefs.setString('token', _token!);
        await _prefs.setString('user', jsonEncode(_user!.toJson()));
        notifyListeners();
      }
      return data;
    } catch (e) { return {'success': false, 'message': e.toString()}; }
    finally { _loading = false; notifyListeners(); }
  }

  Future<void> logout() async {
    _token = null; _user = null;
    await _prefs.remove('token'); await _prefs.remove('user');
    notifyListeners();
  }
}


// ─── lib/providers/booking_provider.dart ──────────────
import 'package:flutter/foundation.dart';
import '../services/api_service.dart';
import '../models/booking_model.dart';

class BookingProvider extends ChangeNotifier {
  List<BookingModel> _bookings   = [];
  BookingModel?      _selected;
  Map<String, dynamic>? _pricing;
  bool _loading = false;

  List<BookingModel> get bookings => _bookings;
  BookingModel?      get selected => _selected;
  Map<String, dynamic>? get pricing => _pricing;
  bool get loading => _loading;
  List<BookingModel> get activeBookings => _bookings.where((b) => b.isActive).toList();

  Future<void> fetchMyBookings() async {
    _loading = true; notifyListeners();
    try {
      final r = await BookingApi.getMyBookings();
      _bookings = (r['bookings'] as List? ?? []).map((j) => BookingModel.fromJson(j)).toList();
    } catch (_) {}
    finally { _loading = false; notifyListeners(); }
  }

  Future<void> fetchById(String id) async {
    try {
      final r = await BookingApi.getById(id);
      _selected = BookingModel.fromJson(r['booking']);
      notifyListeners();
    } catch (_) {}
  }

  Future<bool> getEstimate(Map<String, dynamic> data) async {
    _loading = true; _pricing = null; notifyListeners();
    try {
      final r = await BookingApi.getEstimate(data);
      if (r['success'] == true) { _pricing = r['pricing']; notifyListeners(); return true; }
      return false;
    } catch (_) { return false; }
    finally { _loading = false; notifyListeners(); }
  }

  Future<BookingModel?> createBooking(Map<String, dynamic> data) async {
    _loading = true; notifyListeners();
    try {
      final r = await BookingApi.create(data);
      if (r['success'] == true) {
        final b = BookingModel.fromJson(r['booking']);
        _bookings.insert(0, b);
        notifyListeners();
        return b;
      }
      return null;
    } catch (_) { return null; }
    finally { _loading = false; notifyListeners(); }
  }

  Future<bool> updateStatus(String bookingId, String status, {List<String>? photos, String? message}) async {
    try {
      await BookingApi.updateStatus(bookingId, status, photos: photos, message: message);
      await fetchById(bookingId);
      return true;
    } catch (_) { return false; }
  }

  Future<bool> rateBooking(String bookingId, int score, String review) async {
    try {
      await BookingApi.rate(bookingId, score, review);
      return true;
    } catch (_) { return false; }
  }
}


// ─── lib/providers/tracking_provider.dart ─────────────
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LatLng {
  final double lat, lng;
  const LatLng(this.lat, this.lng);
}

class TrackingProvider extends ChangeNotifier {
  io.Socket? _socket;
  LatLng?    _driverLocation;
  String?    _eta;
  bool       _connected = false;
  bool       _isOnline  = false;
  String?    _activeBookingId;

  LatLng? get driverLocation => _driverLocation;
  String? get eta            => _eta;
  bool    get connected      => _connected;
  bool    get isOnline       => _isOnline;

  // ── Customer: connect & listen for driver location ──
  void listenToBooking(String bookingId) {
    _connectSocket();
    _socket?.emit('join_booking', bookingId);
    _socket?.on('location_update', (data) {
      _driverLocation = LatLng(data['lat'] as double, data['lng'] as double);
      _eta = data['eta']?.toString();
      notifyListeners();
    });
    _socket?.on('booking_status', (data) {
      notifyListeners();
    });
  }

  // ── Driver: go online & start sending GPS ──
  void goOnline(String bookingId) {
    _isOnline       = true;
    _activeBookingId = bookingId;
    _connectSocket();
    _startGps();
    notifyListeners();
  }

  void goOffline() {
    _isOnline       = false;
    _activeBookingId = null;
    _stopGps();
    notifyListeners();
  }

  // ── GPS loop every 10 seconds ──────────────────────
  bool _gpsSending = false;

  void _startGps() async {
    _gpsSending = true;
    while (_gpsSending && _isOnline) {
      try {
        final pos = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
        final lat = pos.latitude;
        final lng = pos.longitude;

        // Send to socket
        if (_activeBookingId != null) {
          _socket?.emit('driver_location', {'bookingId': _activeBookingId, 'lat': lat, 'lng': lng});
        }
        // Also call REST (persist to DB)
        await _updateLocationDb(lat, lng);
      } catch (_) {}
      await Future.delayed(const Duration(seconds: 10));
    }
  }

  void _stopGps() { _gpsSending = false; }

  Future<void> _updateLocationDb(double lat, double lng) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');
      if (token == null) return;
      final http = await import('package:http/http.dart') as h;
      await h.post(
        Uri.parse('${ApiService.baseUrl}/drivers/location'),
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
        body: '{"lat":$lat,"lng":$lng}',
      );
    } catch (_) {}
  }

  void _connectSocket() {
    if (_socket != null && _connected) return;
    SharedPreferences.getInstance().then((prefs) {
      final token = prefs.getString('token');
      _socket = io.io(
        'https://api.shiftease.in', // change for dev
        io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .build(),
      );
      _socket!.onConnect((_)    { _connected = true;  notifyListeners(); });
      _socket!.onDisconnect((_) { _connected = false; notifyListeners(); });
    });
  }

  void disconnect() {
    _socket?.disconnect();
    _socket = null;
    _connected = false;
    _gpsSending = false;
  }

  @override
  void dispose() { disconnect(); super.dispose(); }
}
