import 'package:flutter/foundation.dart';
import '../models/user.dart';
import '../models/auth.dart';
import '../services/auth_service.dart';

class AuthProvider with ChangeNotifier {
  final AuthService _authService = AuthService();
  User? _user;
  bool _isLoading = false;
  bool _isAuthenticated = false;

  User? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _isAuthenticated;

  Future<void> checkAuthStatus() async {
    _isLoading = true;
    notifyListeners();

    final isLoggedIn = await _authService.isLoggedIn();
    if (isLoggedIn) {
      _user = await _authService.getCurrentUser();
      _isAuthenticated = _user != null;
    } else {
      _isAuthenticated = false;
      _user = null;
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    notifyListeners();

    final success = await _authService.login(email, password);
    if (success) {
      _user = await _authService.getCurrentUser();
      _isAuthenticated = _user != null;
    }

    _isLoading = false;
    notifyListeners();
    return success;
  }

  Future<bool> register(String email, String password, String name) async {
    _isLoading = true;
    notifyListeners();

    final success = await _authService.register(email, password, name);
    if (success) {
      _user = await _authService.getCurrentUser();
      _isAuthenticated = _user != null;
    }

    _isLoading = false;
    notifyListeners();
    return success;
  }

  Future<void> setSelectedWorkspace(String workspaceId) async {
    await _authService.setSelectedWorkspace(workspaceId);
    // Reload user to get updated workspace info
    _user = await _authService.getCurrentUser();
    notifyListeners();
  }

  Future<void> logout() async {
    await _authService.logout();
    _user = null;
    _isAuthenticated = false;
    notifyListeners();
  }
}

