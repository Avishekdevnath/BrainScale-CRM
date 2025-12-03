import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/constants.dart';

class StorageService {
  static const _secureStorage = FlutterSecureStorage();
  static SharedPreferences? _prefs;

  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  // Secure Storage (for tokens)
  static Future<void> saveAccessToken(String token) async {
    await _secureStorage.write(key: AppConstants.accessTokenKey, value: token);
  }

  static Future<String?> getAccessToken() async {
    return await _secureStorage.read(key: AppConstants.accessTokenKey);
  }

  static Future<void> saveRefreshToken(String token) async {
    await _secureStorage.write(
        key: AppConstants.refreshTokenKey, value: token);
  }

  static Future<String?> getRefreshToken() async {
    return await _secureStorage.read(key: AppConstants.refreshTokenKey);
  }

  // Workspace storage
  static Future<void> saveSelectedWorkspaceId(String workspaceId) async {
    await _prefs?.setString(AppConstants.selectedWorkspaceIdKey, workspaceId);
  }

  static Future<String?> getSelectedWorkspaceId() async {
    return _prefs?.getString(AppConstants.selectedWorkspaceIdKey);
  }

  static Future<void> clearSelectedWorkspace() async {
    await _prefs?.remove(AppConstants.selectedWorkspaceIdKey);
  }

  static Future<void> clearAll() async {
    await _secureStorage.deleteAll();
    await _prefs?.clear();
  }
}

