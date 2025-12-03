import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/student.dart';
import '../providers/student_provider.dart';
import '../config/theme_config.dart';
import '../widgets/student_stat_card.dart';
import '../widgets/loading_indicator.dart';
import '../utils/phone_handler.dart';
import 'edit_student_screen.dart';

class StudentDetailScreen extends StatefulWidget {
  final String studentId;

  const StudentDetailScreen({
    super.key,
    required this.studentId,
  });

  @override
  State<StudentDetailScreen> createState() => _StudentDetailScreenState();
}

class _StudentDetailScreenState extends State<StudentDetailScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadStudent();
    });
  }

  void _loadStudent() {
    final provider = Provider.of<StudentProvider>(context, listen: false);
    provider.loadStudent(widget.studentId);
  }

  String _getUserInitials(String name) {
    if (name.isEmpty) return 'U';
    final parts = name.split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name[0].toUpperCase();
  }

  Future<void> _makeCall(String phoneNumber) async {
    final success = await PhoneHandler.makeCall(phoneNumber);
    if (!success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Unable to make call'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _navigateToEdit() {
    final provider = Provider.of<StudentProvider>(context, listen: false);
    final student = provider.student;
    if (student != null) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => EditStudentScreen(student: student),
        ),
      ).then((_) {
        // Refresh student data after edit
        _loadStudent();
      });
    }
  }

  void _navigateToCallLog() {
    final provider = Provider.of<StudentProvider>(context, listen: false);
    final student = provider.student;
    if (student != null && student.phones.isNotEmpty) {
      // Create a minimal CallListItem for the call log screen
      // Note: This is a workaround - ideally we'd have a proper call log screen for students
      final primaryPhone = student.phones.firstWhere(
        (p) => p.isPrimary,
        orElse: () => student.phones.first,
      );
      
      // For now, we'll show a message that call logging from student detail needs a call list item
      // In a real implementation, you might want to create a different call log screen
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Call logging requires a call list item. Please use the Calls screen.'),
          backgroundColor: Colors.orange,
        ),
      );
    }
  }

  Color _getStatusColor(StudentStatusType? status) {
    switch (status) {
      case StudentStatusType.converted:
        return const Color(0xFF10B981);
      case StudentStatusType.inProgress:
        return const Color(0xFF3B82F6);
      case StudentStatusType.followUp:
        return const Color(0xFFF59E0B);
      case StudentStatusType.lost:
        return AppColors.error;
      case StudentStatusType.new_:
      default:
        return AppColors.textSecondary;
    }
  }

  String _getStatusLabel(StudentStatusType? status) {
    switch (status) {
      case StudentStatusType.new_:
        return 'New';
      case StudentStatusType.inProgress:
        return 'In Progress';
      case StudentStatusType.followUp:
        return 'Follow Up';
      case StudentStatusType.converted:
        return 'Converted';
      case StudentStatusType.lost:
        return 'Lost';
      default:
        return 'Unknown';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Consumer<StudentProvider>(
          builder: (context, provider, _) {
            return Text(provider.student?.name ?? 'Student Details');
          },
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () {
              final provider = Provider.of<StudentProvider>(context, listen: false);
              if (provider.student != null) {
                _navigateToEdit();
              }
            },
          ),
        ],
      ),
      body: Consumer<StudentProvider>(
        builder: (context, provider, _) {
          if (provider.isLoading) {
            return const LoadingIndicator(message: 'Loading student details...');
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
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _loadStudent,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          final student = provider.student;
          if (student == null) {
            return const Center(
              child: Text('Student not found'),
            );
          }

          final activeEnrollments =
              student.enrollments?.where((e) => e.isActive).toList() ?? [];
          final currentStatus = student.statuses?.isNotEmpty == true
              ? student.statuses!.first.statusType
              : null;

          return RefreshIndicator(
            onRefresh: () => provider.refreshStudent(widget.studentId),
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Profile Section
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        children: [
                          // Avatar
                          Container(
                            width: 80,
                            height: 80,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                                colors: [Color(0xFF3B82F6), Color(0xFF1D4ED8)],
                              ),
                              shape: BoxShape.circle,
                            ),
                            child: Center(
                              child: Text(
                                _getUserInitials(student.name),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 32,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          // Name
                          Text(
                            student.name,
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: AppColors.text,
                            ),
                          ),
                          // Email
                          if (student.email != null) ...[
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.email,
                                    size: 16, color: AppColors.textSecondary),
                                const SizedBox(width: 8),
                                Text(
                                  student.email!,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ],
                          // Tags
                          if (student.tags != null && student.tags!.isNotEmpty) ...[
                            const SizedBox(height: 16),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              alignment: WrapAlignment.center,
                              children: student.tags!
                                  .map((tag) => Chip(
                                        label: Text(tag),
                                        padding: const EdgeInsets.all(4),
                                        backgroundColor:
                                            AppColors.primary.withValues(alpha: 0.1),
                                        labelStyle: const TextStyle(
                                          fontSize: 12,
                                          color: AppColors.primary,
                                        ),
                                      ))
                                  .toList(),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  // Contact Info Section
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Contact Information',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: AppColors.text,
                            ),
                          ),
                          const SizedBox(height: 16),
                          if (student.phones.isEmpty)
                            const Text(
                              'No phone numbers',
                              style: TextStyle(
                                color: AppColors.textSecondary,
                              ),
                            )
                          else
                            ...student.phones.map((phone) => Padding(
                                  padding: const EdgeInsets.only(bottom: 12),
                                  child: Row(
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              phone.number,
                                              style: const TextStyle(
                                                fontSize: 16,
                                                fontWeight: FontWeight.w500,
                                              ),
                                            ),
                                            if (phone.isPrimary) ...[
                                              const SizedBox(height: 4),
                                              Container(
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                        horizontal: 8,
                                                        vertical: 2),
                                                decoration: BoxDecoration(
                                                  color: AppColors.primary
                                                      .withValues(alpha: 0.1),
                                                  borderRadius:
                                                      BorderRadius.circular(4),
                                                ),
                                                child: const Text(
                                                  'Primary',
                                                  style: TextStyle(
                                                    fontSize: 11,
                                                    color: AppColors.primary,
                                                    fontWeight: FontWeight.w600,
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ],
                                        ),
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.phone,
                                            color: Colors.green),
                                        onPressed: () =>
                                            _makeCall(phone.number),
                                      ),
                                    ],
                                  ),
                                )),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  // Statistics Section
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Statistics',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: AppColors.text,
                            ),
                          ),
                          const SizedBox(height: 16),
                          GridView.count(
                            crossAxisCount: 2,
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            crossAxisSpacing: 12,
                            mainAxisSpacing: 12,
                            childAspectRatio: 1.5,
                            children: [
                              StudentStatCard(
                                title: 'Total Calls',
                                value: (student.counts?.calls ?? 0).toString(),
                                color: const Color(0xFF3B82F6),
                              ),
                              StudentStatCard(
                                title: 'Follow-ups',
                                value:
                                    (student.counts?.followups ?? 0).toString(),
                                color: const Color(0xFF10B981),
                              ),
                              StudentStatCard(
                                title: 'Enrollments',
                                value: activeEnrollments.length.toString(),
                                color: const Color(0xFFF59E0B),
                              ),
                              StudentStatCard(
                                title: 'Status',
                                value: currentStatus != null
                                    ? _getStatusLabel(currentStatus)
                                    : 'N/A',
                                color: currentStatus != null
                                    ? _getStatusColor(currentStatus)
                                    : AppColors.textSecondary,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  // Groups/Enrollments Section
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Groups & Enrollments',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: AppColors.text,
                            ),
                          ),
                          const SizedBox(height: 16),
                          if (activeEnrollments.isEmpty)
                            const Padding(
                              padding: EdgeInsets.all(16.0),
                              child: Text(
                                'No active enrollments',
                                style: TextStyle(
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            )
                          else
                            ...activeEnrollments.map((enrollment) => Padding(
                                  padding: const EdgeInsets.only(bottom: 12),
                                  child: Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: AppColors.gray200,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        if (enrollment.group != null)
                                          Text(
                                            enrollment.group!.name,
                                            style: const TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        if (enrollment.course != null) ...[
                                          const SizedBox(height: 4),
                                          Text(
                                            enrollment.course!.name,
                                            style: const TextStyle(
                                              fontSize: 14,
                                              color: AppColors.textSecondary,
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                )),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  // Action Buttons
                  if (student.phones.isNotEmpty) ...[
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () {
                          final primaryPhone = student.phones.firstWhere(
                            (p) => p.isPrimary,
                            orElse: () => student.phones.first,
                          );
                          _makeCall(primaryPhone.number);
                        },
                        icon: const Icon(Icons.phone),
                        label: const Text('Call'),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          backgroundColor: Colors.green,
                          foregroundColor: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: _navigateToCallLog,
                      icon: const Icon(Icons.note_add),
                      label: const Text('Log Call'),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

