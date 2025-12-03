import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'config/theme_config.dart';
import 'services/storage_service.dart';
import 'providers/auth_provider.dart';
import 'providers/calls_provider.dart';
import 'providers/plan_provider.dart';
import 'providers/workspace_provider.dart';
import 'providers/dashboard_provider.dart';
import 'providers/students_provider.dart';
import 'providers/student_provider.dart';
import 'screens/login_screen.dart';
import 'screens/my_calls_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/workspace_selection_screen.dart';
import 'screens/students_list_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await StorageService.init();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => CallsProvider()),
        ChangeNotifierProvider(create: (_) => PlanProvider()),
        ChangeNotifierProvider(create: (_) => WorkspaceProvider()),
        ChangeNotifierProvider(create: (_) => DashboardProvider()),
        ChangeNotifierProvider(create: (_) => StudentsProvider()),
        ChangeNotifierProvider(create: (_) => StudentProvider()),
      ],
      child: MaterialApp(
        title: 'BrainScale CRM',
        theme: AppTheme.lightTheme,
        home: const AuthWrapper(),
        routes: {
          '/login': (context) => const LoginScreen(),
          '/home': (context) => const DashboardScreen(),
          '/dashboard': (context) => const DashboardScreen(),
          '/calls': (context) => const MyCallsScreen(),
          '/students': (context) => const StudentsListScreen(),
        },
      ),
    );
  }
}

class AuthWrapper extends StatefulWidget {
  const AuthWrapper({super.key});

  @override
  State<AuthWrapper> createState() => _AuthWrapperState();
}

class _AuthWrapperState extends State<AuthWrapper> {
  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    await authProvider.checkAuthStatus();

    if (mounted) {
      if (authProvider.isAuthenticated) {
        // Check workspace status
        final workspaceProvider =
            Provider.of<WorkspaceProvider>(context, listen: false);
        await workspaceProvider.checkWorkspaceStatus();

        // Navigate based on workspace count
        if (workspaceProvider.workspaces.length > 1) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
                builder: (_) => const WorkspaceSelectionScreen()),
          );
        } else {
          Navigator.of(context).pushReplacementNamed('/dashboard');
        }
      } else {
        Navigator.of(context).pushReplacementNamed('/login');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: CircularProgressIndicator(),
      ),
    );
  }
}

