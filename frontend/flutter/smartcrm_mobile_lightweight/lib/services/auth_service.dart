import '../services/api_service.dart';
import '../services/storage_service.dart';
import '../models/user.dart';
import '../models/auth.dart';

class AuthService {
  final ApiService _apiService = ApiService();

  Future<bool> login(String email, String password) async {
    try {
      final response = await _apiService.login(email, password);
      
      final accessToken = response['accessToken'] as String?;
      final refreshToken = response['refreshToken'] as String?;

      if (accessToken != null && refreshToken != null) {
        await StorageService.saveAccessToken(accessToken);
        await StorageService.saveRefreshToken(refreshToken);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  Future<bool> isLoggedIn() async {
    final token = await StorageService.getAccessToken();
    return token != null;
  }

  Future<User?> getCurrentUser() async {
    try {
      return await _apiService.getMe();
    } catch (e) {
      return null;
    }
  }

  Future<bool> register(String email, String password, String name) async {
    try {
      final request = RegisterRequest(
        email: email,
        password: password,
        name: name,
      );
      final response = await _apiService.register(request);
      
      await StorageService.saveAccessToken(response.accessToken);
      await StorageService.saveRefreshToken(response.refreshToken);
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<void> setSelectedWorkspace(String workspaceId) async {
    await StorageService.saveSelectedWorkspaceId(workspaceId);
  }

  Future<void> logout() async {
    await StorageService.clearAll();
  }
}

