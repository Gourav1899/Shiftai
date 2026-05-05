// ─── lib/services/api_service.dart ────────────────────
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const String baseUrl = 'https://api.shiftease.in/api'; // change for dev: http://10.0.2.2:5000/api

  static Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  static Future<Map<String, String>> _headers({bool multipart = false}) async {
    final token = await _getToken();
    return {
      if (!multipart) 'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  static Future<Map<String, dynamic>> get(String path) async {
    final res = await http.get(Uri.parse('$baseUrl$path'), headers: await _headers());
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body) async {
    final res = await http.post(Uri.parse('$baseUrl$path'), headers: await _headers(), body: jsonEncode(body));
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> patch(String path, Map<String, dynamic> body) async {
    final res = await http.patch(Uri.parse('$baseUrl$path'), headers: await _headers(), body: jsonEncode(body));
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> uploadFile(File file, String folder) async {
    final token = await _getToken();
    final req   = http.MultipartRequest('POST', Uri.parse('$baseUrl/upload'));
    if (token != null) req.headers['Authorization'] = 'Bearer $token';
    req.fields['folder'] = folder;
    req.files.add(await http.MultipartFile.fromPath('file', file.path));
    final streamed = await req.send();
    final res      = await http.Response.fromStream(streamed);
    return jsonDecode(res.body);
  }
}

// ── Auth API ────────────────────────────────────────────
class AuthApi {
  static Future<Map<String, dynamic>> sendOtp(String phone) =>
      ApiService.post('/auth/send-otp', {'phone': phone});

  static Future<Map<String, dynamic>> verifyOtp(String phone, String otp, {String? name}) =>
      ApiService.post('/auth/verify-otp', {'phone': phone, 'otp': otp, if (name != null) 'name': name});
}

// ── Booking API ────────────────────────────────────────
class BookingApi {
  static Future<Map<String, dynamic>> getEstimate(Map<String, dynamic> data) =>
      ApiService.post('/bookings/estimate', data);

  static Future<Map<String, dynamic>> create(Map<String, dynamic> data) =>
      ApiService.post('/bookings', data);

  static Future<Map<String, dynamic>> getMyBookings() =>
      ApiService.get('/bookings/my');

  static Future<Map<String, dynamic>> getById(String id) =>
      ApiService.get('/bookings/$id');

  static Future<Map<String, dynamic>> cancel(String id, String reason) =>
      ApiService.post('/bookings/$id/cancel', {'reason': reason});

  static Future<Map<String, dynamic>> rate(String id, int score, String review) =>
      ApiService.post('/bookings/$id/rate', {'score': score, 'review': review});

  static Future<Map<String, dynamic>> updateStatus(String id, String status, {List<String>? photos, String? message}) =>
      ApiService.patch('/bookings/$id/status', {'status': status, if (photos != null) 'photos': photos, if (message != null) 'message': message});
}

// ── Driver API ─────────────────────────────────────────
class DriverApi {
  static Future<Map<String, dynamic>> toggleOnline(bool isOnline) =>
      ApiService.post('/drivers/toggle-online', {'isOnline': isOnline});

  static Future<Map<String, dynamic>> updateLocation(double lat, double lng) =>
      ApiService.post('/drivers/location', {'lat': lat, 'lng': lng});

  static Future<Map<String, dynamic>> getActiveJob() =>
      ApiService.get('/drivers/active-job');

  static Future<Map<String, dynamic>> getEarnings() =>
      ApiService.get('/drivers/earnings');
}

// ── Upload API ─────────────────────────────────────────
class UploadApi {
  static Future<String?> uploadFile(File file, String folder) async {
    final res = await ApiService.uploadFile(file, folder);
    return res['url'];
  }
}


// ─── lib/models/booking_model.dart ────────────────────
class BookingModel {
  final String id;
  final String bookingId;
  final String status;
  final Map<String, dynamic> pickup;
  final Map<String, dynamic> dropoff;
  final String? houseType;
  final String serviceType;
  final Map<String, dynamic> pricing;
  final Map<String, dynamic>? driver;
  final List<dynamic> tracking;
  final String? scheduledDate;
  final Map<String, dynamic>? rating;

  BookingModel({
    required this.id, required this.bookingId, required this.status,
    required this.pickup, required this.dropoff,
    this.houseType, required this.serviceType, required this.pricing,
    this.driver, required this.tracking, this.scheduledDate, this.rating,
  });

  factory BookingModel.fromJson(Map<String, dynamic> j) => BookingModel(
    id:            j['_id'] ?? '',
    bookingId:     j['bookingId'] ?? '',
    status:        j['status'] ?? 'pending',
    pickup:        j['pickup'] ?? {},
    dropoff:       j['dropoff'] ?? {},
    houseType:     j['houseType'],
    serviceType:   j['serviceType'] ?? '',
    pricing:       j['pricing'] ?? {},
    driver:        j['driver'],
    tracking:      j['tracking'] ?? [],
    scheduledDate: j['scheduledDate'],
    rating:        j['rating'],
  );

  bool get isActive => !['delivered','cancelled'].contains(status);
  bool get isDelivered => status == 'delivered';
  bool get isCancelled => status == 'cancelled';

  String get pickupCity => pickup['city'] ?? '';
  String get dropCity   => dropoff['city'] ?? '';
  int    get totalAmount => (pricing['totalAmount'] ?? 0).toInt();
}

class TrackingEntry {
  final String status;
  final String? message;
  final List<String> photos;
  final DateTime timestamp;

  TrackingEntry({required this.status, this.message, required this.photos, required this.timestamp});

  factory TrackingEntry.fromJson(Map<String, dynamic> j) => TrackingEntry(
    status:    j['status'] ?? '',
    message:   j['message'],
    photos:    List<String>.from(j['photos'] ?? []),
    timestamp: DateTime.tryParse(j['timestamp'] ?? '') ?? DateTime.now(),
  );
}
