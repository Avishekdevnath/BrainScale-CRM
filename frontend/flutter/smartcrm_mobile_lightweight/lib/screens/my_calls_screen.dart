import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/calls_provider.dart';
import '../providers/auth_provider.dart';
import '../providers/workspace_provider.dart';
import '../config/theme_config.dart';
import '../widgets/call_item_card.dart';
import '../widgets/loading_indicator.dart';
import '../widgets/bottom_navigation.dart';
import '../utils/constants.dart';
import 'call_item_screen.dart';
import 'login_screen.dart';
import 'profile_screen.dart';
import 'more_screen.dart';
import 'groups_screen.dart';
import 'dashboard_screen.dart';
import 'students_list_screen.dart';

class MyCallsScreen extends StatefulWidget {
  const MyCallsScreen({super.key});

  @override
  State<MyCallsScreen> createState() => _MyCallsScreenState();
}

class _MyCallsScreenState extends State<MyCallsScreen> {
  String? _selectedFilter;
  int _currentNavIndex = 3; // Calls tab

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  void _loadData() {
    final callsProvider =
        Provider.of<CallsProvider>(context, listen: false);
    callsProvider.loadMyCalls(state: _selectedFilter);
    callsProvider.loadStats();
  }

  String _getUserInitials(String? name) {
    if (name == null || name.isEmpty) return 'U';
    final parts = name.split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name[0].toUpperCase();
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
          // Statistics Cards (KPI Grid)
          Consumer<CallsProvider>(
            builder: (context, provider, _) {
              if (provider.stats == null) {
                return const SizedBox.shrink();
              }
              final stats = provider.stats!;
              return Container(
                padding: const EdgeInsets.all(16),
                child: GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 1.5,
                  children: [
                    _StatCard(
                      title: 'Total Calls',
                      value: stats.total.toString(),
                      color: const Color(0xFF3B82F6),
                    ),
                    _StatCard(
                      title: 'Completed',
                      value: stats.completed.toString(),
                      color: const Color(0xFF10B981),
                    ),
                    _StatCard(
                      title: 'Pending',
                      value: stats.pending.toString(),
                      color: const Color(0xFFF59E0B),
                    ),
                    _StatCard(
                      title: 'Skipped',
                      value: stats.skipped.toString(),
                      color: const Color(0xFFEF4444),
                    ),
                  ],
                ),
              );
            },
          ),
          // Date Filter
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              color: Color(0xFFF8F8F8),
              border: Border(
                bottom: BorderSide(
                  color: Color(0xFFF0F0F0),
                  width: 1,
                ),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.calendar_today, size: 16, color: AppColors.textSecondary),
                const SizedBox(width: 8),
                Text(
                  'Last 7 days',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          // Filter Chips
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _FilterChip(
                    label: 'All',
                    selected: _selectedFilter == null,
                    onSelected: () {
                      setState(() {
                        _selectedFilter = null;
                      });
                      _loadData();
                    },
                  ),
                  const SizedBox(width: 8),
                  _FilterChip(
                    label: 'Queued',
                    selected: _selectedFilter == AppConstants.stateQueued,
                    onSelected: () {
                      setState(() {
                        _selectedFilter = AppConstants.stateQueued;
                      });
                      _loadData();
                    },
                  ),
                  const SizedBox(width: 8),
                  _FilterChip(
                    label: 'Done',
                    selected: _selectedFilter == AppConstants.stateDone,
                    onSelected: () {
                      setState(() {
                        _selectedFilter = AppConstants.stateDone;
                      });
                      _loadData();
                    },
                  ),
                  const SizedBox(width: 8),
                  _FilterChip(
                    label: 'Skipped',
                    selected: _selectedFilter == AppConstants.stateSkipped,
                    onSelected: () {
                      setState(() {
                        _selectedFilter = AppConstants.stateSkipped;
                      });
                      _loadData();
                    },
                  ),
                ],
              ),
            ),
          ),
          // Call Items List
          Expanded(
            child: Consumer<CallsProvider>(
              builder: (context, provider, _) {
                if (provider.isLoading) {
                  return const LoadingIndicator(message: 'Loading calls...');
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

                final items = provider.filteredCallItems;
                if (items.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.phone_disabled, size: 48, color: AppColors.textSecondary),
                        const SizedBox(height: 16),
                        Text(
                          'No calls found',
                          style: TextStyle(color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async {
                    _loadData();
                  },
                  child: ListView.builder(
                    itemCount: items.length,
                    itemBuilder: (context, index) {
                      final item = items[index];
                      return CallItemCard(
                        item: item,
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => CallItemScreen(callItem: item),
                            ),
                          );
                        },
                      );
                    },
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

  void _handleNavTap(int index) {
    setState(() {
      _currentNavIndex = index;
    });

    switch (index) {
      case 0: // Dashboard
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const DashboardScreen()),
        );
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
        // Already on Calls
        break;
      case 4: // More
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const MoreScreen()),
        );
        break;
    }
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final Color color;

  const _StatCard({
    required this.title,
    required this.value,
    required this.color,
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
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: AppColors.text,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              title,
              style: TextStyle(
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

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onSelected;

  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(
        label,
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: selected ? AppColors.primary : AppColors.textSecondary,
        ),
      ),
      selected: selected,
      onSelected: (_) => onSelected(),
      selectedColor: AppColors.primary.withOpacity(0.1),
      checkmarkColor: AppColors.primary,
      side: BorderSide(
        color: selected ? AppColors.primary : AppColors.border,
        width: 1,
      ),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
    );
  }
}

