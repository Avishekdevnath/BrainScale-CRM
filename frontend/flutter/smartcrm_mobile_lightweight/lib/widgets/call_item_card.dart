import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/call_list_item.dart';
import '../config/theme_config.dart';
import '../utils/constants.dart';

class CallItemCard extends StatelessWidget {
  final CallListItem item;
  final VoidCallback onTap;

  const CallItemCard({
    super.key,
    required this.item,
    required this.onTap,
  });

  String _formatDateTime(DateTime? dateTime) {
    if (dateTime == null) return '';
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final itemDate = DateTime(dateTime.year, dateTime.month, dateTime.day);
    
    if (itemDate == today) {
      return 'Today, ${DateFormat('h:mm a').format(dateTime)}';
    } else if (itemDate == today.subtract(const Duration(days: 1))) {
      return 'Yesterday, ${DateFormat('h:mm a').format(dateTime)}';
    } else {
      return DateFormat('MMM d, h:mm a').format(dateTime);
    }
  }

  String _getStatusIcon() {
    switch (item.state) {
      case AppConstants.stateDone:
        return '✅';
      case AppConstants.stateSkipped:
        return '❌';
      default:
        return '⏱️';
    }
  }

  Color _getStatusColor() {
    switch (item.state) {
      case AppConstants.stateDone:
        return const Color(0xFF10B981);
      case AppConstants.stateSkipped:
        return AppColors.error;
      default:
        return AppColors.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: const BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: Color(0xFFF5F5F5),
              width: 1,
            ),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              item.student.name,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.text,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              _formatDateTime(item.scheduledAt),
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Text(
                  '⏱️ 0 min',
                  style: TextStyle(
                    fontSize: 11,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  '${_getStatusIcon()} ${item.state == AppConstants.stateDone ? 'Answered' : item.state == AppConstants.stateSkipped ? 'Not Answered' : 'Pending'}',
                  style: TextStyle(
                    fontSize: 11,
                    color: _getStatusColor(),
                  ),
                ),
              ],
            ),
            if (item.notes != null && item.notes!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                item.notes!,
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.textSecondary,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

