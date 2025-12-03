import 'package:flutter/foundation.dart';
import '../models/call_list_item.dart';
import '../models/call_log.dart';
import '../services/api_service.dart';

class CallsProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  List<CallListItem> _callItems = [];
  MyCallsStats? _stats;
  bool _isLoading = false;
  String? _error;
  String? _filterState;

  List<CallListItem> get callItems => _callItems;
  MyCallsStats? get stats => _stats;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String? get filterState => _filterState;

  List<CallListItem> get filteredCallItems {
    if (_filterState == null) return _callItems;
    return _callItems.where((item) => item.state == _filterState).toList();
  }

  Future<void> loadMyCalls({String? state}) async {
    _isLoading = true;
    _error = null;
    _filterState = state;
    notifyListeners();

    try {
      _callItems = await _apiService.getMyCalls(state: state);
      _error = null;
    } catch (e) {
      _error = e.toString();
      _callItems = [];
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> loadStats() async {
    try {
      _stats = await _apiService.getMyCallsStats();
      notifyListeners();
    } catch (e) {
      // Silently fail stats loading
    }
  }

  Future<bool> submitCallLog(CallLogRequest request) async {
    try {
      await _apiService.createCallLog(request);
      // Reload calls after successful submission
      await loadMyCalls(state: _filterState);
      await loadStats();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}

