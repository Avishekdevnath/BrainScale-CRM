import 'package:flutter/foundation.dart';
import '../models/student.dart';
import '../services/api_service.dart';
import '../utils/api_error_handler.dart';

class StudentsProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  
  List<Student> _students = [];
  bool _isLoading = false;
  String? _error;
  String _searchQuery = '';
  String? _selectedGroupId;
  String? _selectedStatus;
  int _currentPage = 1;
  int _totalPages = 1;
  int _total = 0;
  bool _hasMore = false;

  List<Student> get students => _students;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String get searchQuery => _searchQuery;
  String? get selectedGroupId => _selectedGroupId;
  String? get selectedStatus => _selectedStatus;
  int get currentPage => _currentPage;
  int get totalPages => _totalPages;
  int get total => _total;
  bool get hasMore => _hasMore;

  Future<void> loadStudents({bool refresh = false}) async {
    if (refresh) {
      _currentPage = 1;
      _students = [];
    }

    if (_isLoading) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiService.listStudents(
        q: _searchQuery.isEmpty ? null : _searchQuery,
        groupId: _selectedGroupId,
        status: _selectedStatus,
        page: _currentPage,
        size: 20,
      );

      final List<dynamic> studentsData = response['students'] as List<dynamic>;
      final List<Student> newStudents = studentsData
          .map((json) => Student.fromJson(json as Map<String, dynamic>))
          .toList();

      if (refresh) {
        _students = newStudents;
      } else {
        _students.addAll(newStudents);
      }

      final pagination = response['pagination'] as Map<String, dynamic>;
      _currentPage = pagination['page'] as int;
      _totalPages = pagination['totalPages'] as int;
      _total = pagination['total'] as int;
      _hasMore = _currentPage < _totalPages;

      _error = null;
    } catch (e) {
      _error = ApiErrorHandler.getErrorMessage(e);
      if (refresh) {
        _students = [];
      }
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> searchStudents(String query) async {
    _searchQuery = query;
    await loadStudents(refresh: true);
  }

  Future<void> filterByGroup(String? groupId) async {
    _selectedGroupId = groupId;
    await loadStudents(refresh: true);
  }

  Future<void> filterByStatus(String? status) async {
    _selectedStatus = status;
    await loadStudents(refresh: true);
  }

  Future<void> loadMore() async {
    if (!_hasMore || _isLoading) return;
    _currentPage++;
    await loadStudents(refresh: false);
  }

  Future<void> refreshStudents() async {
    await loadStudents(refresh: true);
  }

  void clearFilters() {
    _searchQuery = '';
    _selectedGroupId = null;
    _selectedStatus = null;
    notifyListeners();
  }
}

