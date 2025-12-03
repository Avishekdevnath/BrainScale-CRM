import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../config/api_config.dart';
import '../models/user.dart';
import '../models/call_list_item.dart';
import '../models/call_log.dart';
import '../models/auth.dart';
import '../models/plan.dart';
import '../models/workspace.dart';
import '../models/dashboard_stats.dart';
import '../models/student.dart';
import '../services/storage_service.dart';

class ApiService {
  late final Dio _dio;

  ApiService() {
    _dio = Dio(BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: ApiConfig.connectTimeout,
      receiveTimeout: ApiConfig.receiveTimeout,
      headers: {
        'Content-Type': 'application/json',
      },
    ));

    _setupInterceptors();
  }

  void _setupInterceptors() {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await StorageService.getAccessToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          // Add workspace header if available
          final workspaceId = await StorageService.getSelectedWorkspaceId();
          if (workspaceId != null) {
            options.headers['X-Workspace-Id'] = workspaceId;
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          if (error.response?.statusCode == 401) {
            // Try to refresh token
            final refreshed = await _refreshToken();
            if (refreshed) {
              // Retry the request
              final opts = error.requestOptions;
              final token = await StorageService.getAccessToken();
              opts.headers['Authorization'] = 'Bearer $token';
              final response = await _dio.request(
                opts.path,
                options: Options(
                  method: opts.method,
                  headers: opts.headers,
                ),
                data: opts.data,
                queryParameters: opts.queryParameters,
              );
              return handler.resolve(response);
            }
          }
          handler.next(error);
        },
      ),
    );
  }

  Future<bool> _refreshToken() async {
    try {
      final refreshToken = await StorageService.getRefreshToken();
      if (refreshToken == null) return false;

      final response = await _dio.post(
        ApiConfig.refreshEndpoint,
        data: {'refreshToken': refreshToken},
      );

      if (response.statusCode == 200) {
        final newAccessToken = response.data['accessToken'] as String;
        await StorageService.saveAccessToken(newAccessToken);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  // Authentication
  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await _dio.post(
      ApiConfig.loginEndpoint,
      data: {
        'email': email,
        'password': password,
      },
    );
    return response.data;
  }

  Future<User> getMe() async {
    final response = await _dio.get(ApiConfig.meEndpoint);
    return User.fromJson(response.data);
  }

  Future<RegisterResponse> register(RegisterRequest request) async {
    final response = await _dio.post(
      ApiConfig.registerEndpoint,
      data: request.toJson(),
    );
    return RegisterResponse.fromJson(response.data);
  }

  // My Calls
  Future<List<CallListItem>> getMyCalls({
    String? state,
  }) async {
    final response = await _dio.get(
      ApiConfig.myCallsEndpoint,
      queryParameters: {
        if (state != null) 'state': state,
      },
    );
    
    // Handle different response structures
    dynamic data = response.data;
    List<dynamic> items;
    
    if (data is List) {
      // Direct array response
      items = data;
    } else if (data is Map<String, dynamic>) {
      // Wrapped response - try common keys
      items = data['data'] as List? ?? 
              data['items'] as List? ?? 
              data['calls'] as List? ?? 
              [];
    } else {
      items = [];
    }
    
    return items
        .map((json) {
          try {
            return CallListItem.fromJson(json as Map<String, dynamic>);
          } catch (e) {
            debugPrint('Error parsing CallListItem: $e');
            debugPrint('JSON: $json');
            rethrow;
          }
        })
        .toList();
  }

  Future<MyCallsStats> getMyCallsStats() async {
    final response = await _dio.get(ApiConfig.myCallsStatsEndpoint);
    return MyCallsStats.fromJson(response.data);
  }

  // Plans
  Future<List<Plan>> getPlans() async {
    final response = await _dio.get(ApiConfig.plansEndpoint);
    
    // Handle different response structures
    dynamic data = response.data;
    List<dynamic> items;
    
    if (data is List) {
      items = data;
    } else if (data is Map<String, dynamic>) {
      items = data['data'] as List? ?? 
              data['items'] as List? ?? 
              data['plans'] as List? ?? 
              [];
    } else {
      items = [];
    }
    
    return items
        .map((json) => Plan.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  // Workspaces
  Future<Workspace> createWorkspace(WorkspaceRequest request) async {
    final response = await _dio.post(
      ApiConfig.workspacesEndpoint,
      data: request.toJson(),
    );
    return Workspace.fromJson(response.data);
  }

  Future<List<Workspace>> getWorkspaces() async {
    final response = await _dio.get(ApiConfig.workspacesEndpoint);
    
    // Handle different response structures
    dynamic data = response.data;
    List<dynamic> items;
    
    if (data is List) {
      items = data;
    } else if (data is Map<String, dynamic>) {
      items = data['data'] as List? ?? 
              data['items'] as List? ?? 
              data['workspaces'] as List? ?? 
              [];
    } else {
      items = [];
    }
    
    return items
        .map((json) => Workspace.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<void> selectWorkspace(String workspaceId) async {
    await _dio.post('${ApiConfig.workspacesEndpoint}/$workspaceId/select');
    await StorageService.saveSelectedWorkspaceId(workspaceId);
  }

  // Call Logs
  Future<CallLog> createCallLog(CallLogRequest request) async {
    final response = await _dio.post(
      ApiConfig.callLogsEndpoint,
      data: request.toJson(),
    );
    return CallLog.fromJson(response.data);
  }

  // Dashboard
  Future<DashboardKPIs> getDashboardKPIs() async {
    final response = await _dio.get(ApiConfig.dashboardKPIsEndpoint);
    return DashboardKPIs.fromJson(response.data);
  }

  Future<List<ActivityItem>> getRecentActivity({int limit = 10}) async {
    final response = await _dio.get(
      ApiConfig.dashboardRecentActivityEndpoint,
      queryParameters: {'limit': limit},
    );
    
    // Handle different response structures
    dynamic data = response.data;
    List<dynamic> items;
    
    if (data is List) {
      items = data;
    } else if (data is Map<String, dynamic>) {
      items = data['data'] as List? ?? 
              data['items'] as List? ?? 
              data['activity'] as List? ?? 
              [];
    } else {
      items = [];
    }
    
    return items
        .map((json) => ActivityItem.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  // Students
  Future<Map<String, dynamic>> listStudents({
    String? q,
    String? groupId,
    String? status,
    int? page,
    int? size,
  }) async {
    final response = await _dio.get(
      ApiConfig.studentsEndpoint,
      queryParameters: {
        if (q != null && q.isNotEmpty) 'q': q,
        if (groupId != null) 'groupId': groupId,
        if (status != null) 'status': status,
        if (page != null) 'page': page,
        if (size != null) 'size': size,
      },
    );
    return response.data;
  }

  Future<Student> getStudent(String studentId) async {
    final response = await _dio.get('${ApiConfig.studentsEndpoint}/$studentId');
    return Student.fromJson(response.data);
  }

  Future<Student> updateStudent(
    String studentId,
    Map<String, dynamic> data,
  ) async {
    final response = await _dio.patch(
      '${ApiConfig.studentsEndpoint}/$studentId',
      data: data,
    );
    return Student.fromJson(response.data);
  }
}

