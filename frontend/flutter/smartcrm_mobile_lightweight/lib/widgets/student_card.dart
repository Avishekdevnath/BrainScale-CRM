import 'package:flutter/material.dart';
import '../models/student.dart';
import '../config/theme_config.dart';

class StudentCard extends StatelessWidget {
  final Student student;
  final VoidCallback? onTap;

  const StudentCard({
    super.key,
    required this.student,
    this.onTap,
  });

  String _getInitials(String name) {
    final parts = name.split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name[0].toUpperCase();
  }

  Color _getStatusColor(String status) {
    // Handle both enum string format and uppercase format
    final normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'new_':
      case 'new':
        return AppColors.success; // Green
      case 'inprogress':
      case 'in_progress':
        return AppColors.warning; // Yellow/Orange
      case 'followup':
      case 'follow_up':
        return AppColors.error; // Red
      case 'converted':
        return AppColors.primary; // Teal
      case 'lost':
        return AppColors.textSecondary; // Gray
      default:
        return AppColors.textSecondary;
    }
  }

  String _getStatusLabel(String status) {
    // Status comes as 'new_', 'inProgress', etc. from enum toString()
    // Convert to display format
    switch (status) {
      case 'new_':
        return 'NEW';
      case 'inProgress':
        return 'IN_PROGRESS';
      case 'followUp':
        return 'FOLLOW_UP';
      case 'converted':
        return 'CONVERTED';
      case 'lost':
        return 'LOST';
      default:
        // If already in uppercase format, return as is
        return status.toUpperCase();
    }
  }

  @override
  Widget build(BuildContext context) {
    // Get first active enrollment's group
    final activeEnrollments = student.enrollments?.where((e) => e.isActive).toList();
    final activeEnrollment = activeEnrollments != null && activeEnrollments.isNotEmpty
        ? activeEnrollments.first
        : null;
    final groupName = activeEnrollment?.group?.name;

    // Get status - prefer status from the active enrollment's group, otherwise first status
    String? status;
    if (activeEnrollment != null && student.statuses != null) {
      final groupStatuses = student.statuses!
          .where((s) => s.groupId == activeEnrollment.groupId)
          .toList();
      final groupStatus = groupStatuses.isNotEmpty ? groupStatuses.first : null;
      status = groupStatus?.statusType.toString().split('.').last;
    } else if (student.statuses != null && student.statuses!.isNotEmpty) {
      status = student.statuses!.first.statusType.toString().split('.').last;
    }

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: AppColors.cardBorder,
            width: 1,
          ),
        ),
        child: Row(
          children: [
            // Avatar
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [AppColors.primary, AppColors.primaryHover],
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Center(
                child: Text(
                  _getInitials(student.name),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            // Student Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    student.name,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.text,
                    ),
                  ),
                  if (student.email != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      student.email!,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                  const SizedBox(height: 8),
                  // Badges
                  Wrap(
                    spacing: 8,
                    runSpacing: 4,
                    children: [
                      if (groupName != null)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: AppColors.primary.withValues(alpha: 0.2),
                              width: 1,
                            ),
                          ),
                          child: Text(
                            groupName,
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w500,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                      if (status != null)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: _getStatusColor(status).withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: _getStatusColor(status).withValues(alpha: 0.2),
                              width: 1,
                            ),
                          ),
                          child: Text(
                            _getStatusLabel(status),
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w500,
                              color: _getStatusColor(status),
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

