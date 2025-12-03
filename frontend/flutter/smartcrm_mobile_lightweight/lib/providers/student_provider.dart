import 'package:flutter/foundation.dart';
import '../models/student.dart';
import '../services/api_service.dart';
import '../utils/api_error_handler.dart';

class StudentProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  Student? _student;
  bool _isLoading = false;
  String? _error;

  Student? get student => _student;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadStudent(String studentId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _student = await _apiService.getStudent(studentId);
      _error = null;
    } catch (e) {
      _error = ApiErrorHandler.getErrorMessage(e);
      _student = null;
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> refreshStudent(String studentId) async {
    await loadStudent(studentId);
  }

  Future<bool> updateStudent(
    String studentId,
    Map<String, dynamic> data,
  ) async {
    try {
      _student = await _apiService.updateStudent(studentId, data);
      _error = null;
      notifyListeners();
      return true;
    } catch (e) {
      _error = ApiErrorHandler.getErrorMessage(e);
      notifyListeners();
      return false;
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  void clear() {
    _student = null;
    _error = null;
    _isLoading = false;
    notifyListeners();
  }
}

