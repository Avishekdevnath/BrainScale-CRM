import 'package:flutter/foundation.dart';
import '../models/plan.dart';
import '../services/api_service.dart';

class PlanProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  List<Plan> _plans = [];
  Plan? _selectedPlan;
  bool _isLoading = false;
  String? _error;

  List<Plan> get plans => _plans;
  Plan? get selectedPlan => _selectedPlan;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadPlans() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _plans = await _apiService.getPlans();
      _error = null;
    } catch (e) {
      _error = e.toString();
      _plans = [];
    }

    _isLoading = false;
    notifyListeners();
  }

  void selectPlan(Plan plan) {
    _selectedPlan = plan;
    notifyListeners();
  }

  void clearSelection() {
    _selectedPlan = null;
    notifyListeners();
  }
}

