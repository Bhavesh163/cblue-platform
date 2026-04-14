import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../core/constants.dart';

class ApiService {
  static final Dio _dio = Dio(BaseOptions(
    baseUrl: AppConstants.apiBaseUrl,
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 15),
    headers: {'Content-Type': 'application/json'},
  ));

  static const _storage = FlutterSecureStorage();

  static Future<Dio> get _authedDio async {
    final token = await _storage.read(key: 'subscriber_token');
    if (token != null) {
      _dio.options.headers['Authorization'] = 'Bearer $token';
    }
    return _dio;
  }

  // Auth
  static Future<Map<String, dynamic>> register({
    required String name,
    required String email,
    required String password,
    String? phone,
    String? company,
  }) async {
    final res = await _dio.post('/subscription/register', data: {
      'name': name,
      'email': email,
      'password': password,
      if (phone != null) 'phone': phone,
      if (company != null) 'company': company,
    });
    return res.data;
  }

  static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final res = await _dio.post('/subscription/login', data: {
      'email': email,
      'password': password,
    });
    return res.data;
  }

  static Future<void> forgotPassword(String email) async {
    await _dio.post('/subscription/forgot-password', data: {'email': email});
  }

  // Orders
  static Future<List<dynamic>> getMyOrders() async {
    final dio = await _authedDio;
    final res = await dio.get('/orders/my');
    return res.data;
  }

  static Future<Map<String, dynamic>> createOrder(Map<String, dynamic> data) async {
    final dio = await _authedDio;
    final res = await dio.post('/orders', data: data);
    return res.data;
  }

  // Matching
  static Future<List<dynamic>> getMatches(String orderId) async {
    final dio = await _authedDio;
    final res = await dio.get('/matching/$orderId');
    return res.data;
  }

  // Properties
  static Future<List<dynamic>> getProperties({String? type, String? province}) async {
    final params = <String, dynamic>{};
    if (type != null) params['type'] = type;
    if (province != null) params['province'] = province;
    final res = await _dio.get('/properties', queryParameters: params);
    return res.data;
  }

  // Payment
  static Future<Map<String, dynamic>> generateQR(String orderId, int amount) async {
    final dio = await _authedDio;
    final res = await dio.post('/payments/promptpay', data: {
      'orderId': orderId,
      'amount': amount,
    });
    return res.data;
  }

  // Reviews
  static Future<void> submitReview({
    required String orderId,
    required int stars,
    required String comment,
  }) async {
    final dio = await _authedDio;
    await dio.post('/reviews', data: {
      'orderId': orderId,
      'rating': stars,
      'comment': comment,
    });
  }

  // Property workflow
  static Future<Map<String, dynamic>> createPropertyOrder({
    required String propertyId,
    required String tier,
    required int fee,
  }) async {
    final dio = await _authedDio;
    final res = await dio.post('/properties/orders', data: {
      'propertyId': propertyId,
      'tier': tier,
      'processingFee': fee,
    });
    return res.data;
  }

  static Future<Map<String, dynamic>> confirmPropertyPayment(String orderId) async {
    final dio = await _authedDio;
    final res = await dio.post('/properties/orders/$orderId/payment');
    return res.data;
  }

  static Future<Map<String, dynamic>> getPropertyOrderDetails(String orderId) async {
    final dio = await _authedDio;
    final res = await dio.get('/properties/orders/$orderId');
    return res.data;
  }

  static Future<void> submitPropertyReview({
    required String orderId,
    required int stars,
    required String comment,
  }) async {
    final dio = await _authedDio;
    await dio.post('/properties/orders/$orderId/review', data: {
      'rating': stars,
      'comment': comment,
    });
  }

  // Postal code lookup
  static Future<Map<String, dynamic>?> lookupPostalCode(String code) async {
    try {
      final res = await _dio.get('/geo/postal/$code');
      return res.data;
    } catch (_) {
      return null;
    }
  }
}
