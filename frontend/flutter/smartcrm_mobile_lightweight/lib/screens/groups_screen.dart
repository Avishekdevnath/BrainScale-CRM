import 'package:flutter/material.dart';
import '../config/theme_config.dart';
import '../widgets/bottom_navigation.dart';
import 'dashboard_screen.dart';
import 'students_list_screen.dart';
import 'my_calls_screen.dart';
import 'more_screen.dart';

class GroupsScreen extends StatefulWidget {
  const GroupsScreen({super.key});

  @override
  State<GroupsScreen> createState() => _GroupsScreenState();
}

class _GroupsScreenState extends State<GroupsScreen> {
  int _currentNavIndex = 2; // Groups tab

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
        // Already on Groups
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
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Groups',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: AppColors.text,
                  ),
                ),
              ],
            ),
          ),
          // Content
          Expanded(
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.group_outlined,
                    size: 64,
                    color: AppColors.textSecondary,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Groups Coming Soon',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: AppColors.text,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'This feature will be available in a future update',
                    style: TextStyle(
                      fontSize: 14,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
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

