import 'package:flutter/foundation.dart';
import '../models/dashboard_stats.dart';
import '../services/api_service.dart';

class DashboardProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  DashboardKPIs? _kpis;
  List<ActivityItem> _recentActivity = [];
  bool _isLoading = false;
  String? _error;

  DashboardKPIs? get kpis => _kpis;
  List<ActivityItem> get recentActivity => _recentActivity;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadDashboardData({int activityLimit = 10}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Load KPIs and activity in parallel
      final results = await Future.wait([
        _apiService.getDashboardKPIs(),
        _apiService.getRecentActivity(limit: activityLimit),
      ]);

      _kpis = results[0] as DashboardKPIs;
      _recentActivity = results[1] as List<ActivityItem>;
      _error = null;
    } catch (e) {
      _error = e.toString();
      _kpis = null;
      _recentActivity = [];
      debugPrint('Error loading dashboard data: $e');
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> refreshDashboard({int activityLimit = 10}) async {
    await loadDashboardData(activityLimit: activityLimit);
  }

  Future<void> loadKPIs() async {
    try {
      _kpis = await _apiService.getDashboardKPIs();
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      debugPrint('Error loading KPIs: $e');
      notifyListeners();
    }
  }

  Future<void> loadRecentActivity({int limit = 10}) async {
    try {
      _recentActivity = await _apiService.getRecentActivity(limit: limit);
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      debugPrint('Error loading recent activity: $e');
      notifyListeners();
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}

