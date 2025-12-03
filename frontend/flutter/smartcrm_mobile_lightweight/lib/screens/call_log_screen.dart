import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/call_list_item.dart';
import '../models/call_log.dart';
import '../providers/calls_provider.dart';
import '../utils/constants.dart';
import 'my_calls_screen.dart';

class CallLogScreen extends StatefulWidget {
  final CallListItem callItem;

  const CallLogScreen({super.key, required this.callItem});

  @override
  State<CallLogScreen> createState() => _CallLogScreenState();
}

class _CallLogScreenState extends State<CallLogScreen> {
  final _formKey = GlobalKey<FormState>();
  final _notesController = TextEditingController();
  String _selectedStatus = AppConstants.statusCompleted;
  int? _callDuration;

  final List<Map<String, dynamic>> _statusOptions = [
    {'value': AppConstants.statusCompleted, 'label': 'Completed'},
    {'value': AppConstants.statusMissed, 'label': 'Missed'},
    {'value': AppConstants.statusBusy, 'label': 'Busy'},
    {'value': AppConstants.statusNoAnswer, 'label': 'No Answer'},
    {'value': AppConstants.statusVoicemail, 'label': 'Voicemail'},
    {'value': AppConstants.statusOther, 'label': 'Other'},
  ];

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submitCallLog() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    final callsProvider =
        Provider.of<CallsProvider>(context, listen: false);

    final request = CallLogRequest(
      callListItemId: widget.callItem.id,
      status: _selectedStatus,
      callDuration: _callDuration,
      notes: _notesController.text.trim().isEmpty
          ? null
          : _notesController.text.trim(),
    );

    final success = await callsProvider.submitCallLog(request);

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Call logged successfully'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const MyCallsScreen()),
          (route) => false,
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
                'Failed to log call: ${callsProvider.error ?? "Unknown error"}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Log Call'),
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Student Info
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Student',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        widget.callItem.student.name,
                        style: const TextStyle(fontSize: 18),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              // Call Status
              const Text(
                'Call Status *',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              ..._statusOptions.map((option) => RadioListTile<String>(
                    title: Text(option['label']),
                    value: option['value'],
                    groupValue: _selectedStatus,
                    onChanged: (value) {
                      setState(() {
                        _selectedStatus = value!;
                      });
                    },
                  )),
              const SizedBox(height: 24),
              // Call Duration (Optional)
              TextFormField(
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Call Duration (seconds)',
                  hintText: 'Optional',
                  prefixIcon: Icon(Icons.timer),
                ),
                onChanged: (value) {
                  _callDuration = value.isEmpty
                      ? null
                      : int.tryParse(value);
                },
                validator: (value) {
                  if (value != null &&
                      value.isNotEmpty &&
                      int.tryParse(value) == null) {
                    return 'Please enter a valid number';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 24),
              // Notes
              TextFormField(
                controller: _notesController,
                maxLines: 5,
                decoration: const InputDecoration(
                  labelText: 'Notes',
                  hintText: 'Enter call notes...',
                  prefixIcon: Icon(Icons.note),
                ),
              ),
              const SizedBox(height: 32),
              // Submit Button
              SizedBox(
                width: double.infinity,
                child: Consumer<CallsProvider>(
                  builder: (context, provider, _) {
                    return ElevatedButton(
                      onPressed: provider.isLoading ? null : _submitCallLog,
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: provider.isLoading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                              ),
                            )
                          : const Text('Submit Call Log'),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

