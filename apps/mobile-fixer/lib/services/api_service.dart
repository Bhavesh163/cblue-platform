import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:io';
import '../core/constants.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  late final Dio _dio;
  final _storage = const FlutterSecureStorage();

  ApiService._internal() {
    _dio = Dio(BaseOptions(
      baseUrl: AppConstants.apiBase,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {'Content-Type': 'application/json'},
    ));
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: 'partner_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
    ));
  }

  // Auth ---------------------------------------------------------------
  Future<Response> register(Map<String, dynamic> data) =>
      _dio.post('/fixer/register', data: data);

  Future<Response> login(String email, String password) =>
      _dio.post('/auth/fixer-login', data: {'email': email, 'password': password});

  Future<Response> forgotPassword(String email) =>
      _dio.post('/auth/forgot-password', data: {'email': email, 'role': 'fixer'});

  // KYC ----------------------------------------------------------------
  Future<Response> uploadKyc({File? selfie, File? idCard}) async {
    final formData = FormData();
    if (selfie != null) {
      formData.files.add(MapEntry('selfie', await MultipartFile.fromFile(selfie.path, filename: 'selfie.jpg')));
    }
    if (idCard != null) {
      formData.files.add(MapEntry('idCard', await MultipartFile.fromFile(idCard.path, filename: 'id_card.jpg')));
    }
    return _dio.post('/fixer/kyc', data: formData);
  }

  // Portfolio ----------------------------------------------------------
  Future<Response> uploadPortfolio(List<File> files) async {
    final formData = FormData();
    for (int i = 0; i < files.length; i++) {
      final name = files[i].path.split('/').last;
      formData.files.add(MapEntry('portfolio', await MultipartFile.fromFile(files[i].path, filename: name)));
    }
    return _dio.post('/fixer/portfolio', data: formData);
  }

  Future<Response> getAiEvaluation() => _dio.get('/fixer/ai-evaluation');

  // Jobs ---------------------------------------------------------------
  Future<Response> getMyJobs({String? status}) =>
      _dio.get('/fixer/jobs', queryParameters: status != null ? {'status': status} : null);

  Future<Response> acceptJob(String jobId) =>
      _dio.post('/fixer/jobs/$jobId/accept');

  Future<Response> declineJob(String jobId) =>
      _dio.post('/fixer/jobs/$jobId/decline');

  Future<Response> completeJob(String jobId) =>
      _dio.post('/fixer/jobs/$jobId/complete');

  Future<Response> getJobDetails(String jobId) =>
      _dio.get('/fixer/jobs/$jobId');

  // Properties ---------------------------------------------------------
  Future<Response> getMyProperties() => _dio.get('/fixer/properties');

  Future<Response> createProperty(Map<String, dynamic> data) =>
      _dio.post('/property', data: data);

  Future<Response> updateProperty(String id, Map<String, dynamic> data) =>
      _dio.put('/property/$id', data: data);

  Future<Response> deleteProperty(String id) =>
      _dio.delete('/property/$id');

  Future<Response> togglePropertyStatus(String id, bool active) =>
      _dio.patch('/property/$id/status', data: {'active': active});

  Future<Response> uploadPropertyImages(String id, FormData formData) =>
      _dio.post('/property/$id/images', data: formData);

  // Reviews ------------------------------------------------------------
  Future<Response> getMyReviews() => _dio.get('/fixer/reviews');

  // Profile ------------------------------------------------------------
  Future<Response> getProfile() => _dio.get('/fixer/profile');

  Future<Response> updateProfile(Map<String, dynamic> data) =>
      _dio.put('/fixer/profile', data: data);

  // Earnings -----------------------------------------------------------
  Future<Response> getEarnings() => _dio.get('/fixer/earnings');
}
