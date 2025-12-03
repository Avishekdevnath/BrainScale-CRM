import 'package:flutter/material.dart';
import '../models/call_list_item.dart';
import '../utils/phone_handler.dart';
import '../utils/constants.dart';
import 'call_log_screen.dart';
import 'student_detail_screen.dart';

class CallItemScreen extends StatelessWidget {
  final CallListItem callItem;

  const CallItemScreen({super.key, required this.callItem});

  Future<void> _makeCall(BuildContext context, String phoneNumber) async {
    final success = await PhoneHandler.makeCall(phoneNumber);
    if (!success && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Unable to make call'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _navigateToCallLog(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => CallLogScreen(callItem: callItem),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final student = callItem.student;
    final primaryPhone = student.phones.firstWhere(
      (p) => p.isPrimary,
      orElse: () => student.phones.first,
    );

    return Scaffold(
      appBar: AppBar(
        title: Text(student.name),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Student Info Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    InkWell(
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => StudentDetailScreen(
                              studentId: student.id,
                            ),
                          ),
                        );
                      },
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              student.name,
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          const Icon(
                            Icons.arrow_forward_ios,
                            size: 16,
                            color: Colors.grey,
                          ),
                        ],
                      ),
                    ),
                    if (student.email != null) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          const Icon(Icons.email, size: 20),
                          const SizedBox(width: 8),
                          Text(student.email!),
                        ],
                      ),
                    ],
                    const SizedBox(height: 16),
                    const Text(
                      'Phone Numbers',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ...student.phones.map((phone) => Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(phone.number),
                              ),
                              if (phone.isPrimary)
                                const Chip(
                                  label: Text('Primary'),
                                  padding: EdgeInsets.all(4),
                                ),
                              const SizedBox(width: 8),
                              IconButton(
                                icon: const Icon(Icons.phone),
                                color: Colors.green,
                                onPressed: () =>
                                    _makeCall(context, phone.number),
                              ),
                            ],
                          ),
                        )),
                    if (student.tags != null && student.tags!.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      Wrap(
                        spacing: 8,
                        children: student.tags!
                            .map((tag) => Chip(label: Text(tag)))
                            .toList(),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            // State Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    const Text(
                      'Status: ',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: _getStateColor(callItem.state).withOpacity(0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        callItem.state,
                        style: TextStyle(
                          color: _getStateColor(callItem.state),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            // Action Buttons
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _makeCall(context, primaryPhone.number),
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
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => _navigateToCallLog(context),
                icon: const Icon(Icons.note_add),
                label: const Text('Log Call'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _getStateColor(String state) {
    switch (state) {
      case AppConstants.stateDone:
        return Colors.green;
      case AppConstants.stateSkipped:
        return Colors.orange;
      case AppConstants.stateCalling:
        return Colors.blue;
      default:
        return Colors.grey;
    }
  }
}

