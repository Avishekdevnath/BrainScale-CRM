import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/dashboard_provider.dart';
import '../providers/auth_provider.dart';
import '../providers/workspace_provider.dart';
import '../config/theme_config.dart';
import '../widgets/bottom_navigation.dart';
import '../widgets/loading_indicator.dart';
import 'my_calls_screen.dart';
import 'students_list_screen.dart';
import 'profile_screen.dart';
import 'more_screen.dart';
import 'groups_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _currentNavIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  void _loadData() {
    final dashboardProvider =
        Provider.of<DashboardProvider>(context, listen: false);
    dashboardProvider.loadDashboardData();
    
    // Also ensure workspaces are loaded
    final workspaceProvider =
        Provider.of<WorkspaceProvider>(context, listen: false);
    if (workspaceProvider.workspaces.isEmpty) {
      workspaceProvider.loadWorkspaces();
    }
  }

  String _getUserInitials(String? name) {
    if (name == null || name.isEmpty) return 'U';
    final parts = name.split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name[0].toUpperCase();
  }

  void _handleNavTap(int index) {
    setState(() {
      _currentNavIndex = index;
    });

    // Navigate to different screens based on index
    switch (index) {
      case 0:
        // Already on Dashboard
        break;
      case 1: // Students
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const StudentsListScreen()),
        );
        break;
      case 2: // Groups
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const GroupsScreen()),
        );
        break;
      case 3: // Calls
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const MyCallsScreen()),
        );
        break;
      case 4: // More
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const MoreScreen()),
        );
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          // Custom Top Bar
          Container(
            padding: EdgeInsets.only(
              top: MediaQuery.of(context).padding.top + 16,
              left: 20,
              right: 20,
              bottom: 16,
            ),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(
                bottom: BorderSide(
                  color: Color(0xFFF0F0F0),
                  width: 1,
                ),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Text(
                      'BrainScale',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                    Text(
                      ' CRM',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: AppColors.text,
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    Container(
                      width: 24,
                      height: 24,
                      decoration: BoxDecoration(
                        color: AppColors.gray200,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Stack(
                        children: [
                          Center(
                            child: Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                color: AppColors.error,
                                shape: BoxShape.circle,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Consumer<AuthProvider>(
                      builder: (context, authProvider, _) {
                        final userName = authProvider.user?.name ?? 'User';
                        return GestureDetector(
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(builder: (_) => const ProfileScreen()),
                            );
                          },
                          child: Container(
                            width: 32,
                            height: 32,
                            decoration: const BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                                colors: [Color(0xFF3B82F6), Color(0xFF1D4ED8)],
                              ),
                              shape: BoxShape.circle,
                            ),
                            child: Center(
                              child: Text(
                                _getUserInitials(userName),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Content
          Expanded(
            child: Consumer<DashboardProvider>(
              builder: (context, provider, _) {
                if (provider.isLoading) {
                  return const LoadingIndicator(message: 'Loading dashboard...');
                }

                if (provider.error != null) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline,
                            size: 48, color: AppColors.error),
                        const SizedBox(height: 16),
                        Text(
                          'Error: ${provider.error}',
                          style: const TextStyle(color: AppColors.text),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _loadData,
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async {
                    await provider.refreshDashboard();
                  },
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // KPI Grid
                        if (provider.kpis != null) ...[
                          Container(
                            padding: const EdgeInsets.all(16),
                            child: GridView.count(
                              crossAxisCount: 2,
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              crossAxisSpacing: 12,
                              mainAxisSpacing: 12,
                              childAspectRatio: 1.5,
                              children: [
                                _KPICard(
                                  title: 'Total Students',
                                  value: provider.kpis!.overview.totalStudents
                                      .toString(),
                                ),
                                _KPICard(
                                  title: 'Calls',
                                  value:
                                      provider.kpis!.overview.totalCalls.toString(),
                                ),
                                _KPICard(
                                  title: 'Follow-ups',
                                  value: provider.kpis!.followups.total.toString(),
                                ),
                                _KPICard(
                                  title: 'Conversion Rate',
                                  value:
                                      '${provider.kpis!.metrics.conversionRate.toStringAsFixed(1)}%',
                                ),
                              ],
                            ),
                          ),
                          // Recent Activity Section
                          const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 16),
                            child: Text(
                              'Recent Activity',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: AppColors.text,
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          if (provider.recentActivity.isEmpty)
                            Padding(
                              padding: const EdgeInsets.all(16),
                              child: Center(
                                child: Text(
                                  'No recent activity',
                                  style: TextStyle(
                                    color: AppColors.textSecondary,
                                    fontSize: 14,
                                  ),
                                ),
                              ),
                            )
                          else
                            ...provider.recentActivity.map((activity) => Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 16, vertical: 12),
                                  decoration: const BoxDecoration(
                                    border: Border(
                                      bottom: BorderSide(
                                        color: Color(0xFFF5F5F5),
                                        width: 1,
                                      ),
                                    ),
                                  ),
                                  child: Text(
                                    activity.description,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      color: AppColors.text,
                                    ),
                                  ),
                                )),
                          const SizedBox(height: 100), // Space for bottom nav
                        ] else
                          const Padding(
                            padding: EdgeInsets.all(16),
                            child: Center(
                              child: Text('No data available'),
                            ),
                          ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
      bottomNavigationBar: BottomNavigation(
        currentIndex: _currentNavIndex,
        onTap: _handleNavTap,
      ),
    );
  }
}

class _KPICard extends StatelessWidget {
  final String title;
  final String value;

  const _KPICard({
    required this.title,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: AppColors.cardBorder,
          width: 1,
        ),
      ),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              value,
              style: const TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: AppColors.text,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              title,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

