import 'package:flutter/foundation.dart';
import '../models/workspace.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';

class WorkspaceProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  List<Workspace> _workspaces = [];
  Workspace? _selectedWorkspace;
  bool _isLoading = false;
  String? _error;

  List<Workspace> get workspaces => _workspaces;
  Workspace? get selectedWorkspace => _selectedWorkspace;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadWorkspaces() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _workspaces = await _apiService.getWorkspaces();
      // Load selected workspace from storage
      final savedWorkspaceId = await StorageService.getSelectedWorkspaceId();
      if (savedWorkspaceId != null && _workspaces.isNotEmpty) {
        try {
          _selectedWorkspace = _workspaces.firstWhere(
            (w) => w.id == savedWorkspaceId,
          );
        } catch (e) {
          // Saved workspace not found, use first one
          _selectedWorkspace = _workspaces.first;
        }
      } else if (_workspaces.isNotEmpty) {
        _selectedWorkspace = _workspaces.first;
      }
      _error = null;
    } catch (e) {
      _error = e.toString();
      _workspaces = [];
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> createWorkspace(WorkspaceRequest request) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final workspace = await _apiService.createWorkspace(request);
      await StorageService.saveSelectedWorkspaceId(workspace.id);
      _selectedWorkspace = workspace;
      _workspaces.add(workspace);
      _error = null;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> selectWorkspace(String workspaceId) async {
    _isLoading = true;
    notifyListeners();

    try {
      await _apiService.selectWorkspace(workspaceId);
      await StorageService.saveSelectedWorkspaceId(workspaceId);
      _selectedWorkspace = _workspaces.firstWhere(
        (w) => w.id == workspaceId,
      );
      _error = null;
    } catch (e) {
      _error = e.toString();
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> checkWorkspaceStatus() async {
    await loadWorkspaces();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}

