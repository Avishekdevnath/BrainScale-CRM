import 'package:json_annotation/json_annotation.dart';
import 'student.dart';

part 'call_list_item.g.dart';

@JsonSerializable()
class CallListItem {
  final String id;
  final String callListId;
  final String studentId;
  final String? assignedTo;
  final String? callLogId;
  final String state; // QUEUED, CALLING, DONE, SKIPPED
  final int priority;
  final Student student;
  @JsonKey(fromJson: _dateTimeFromJson, toJson: _dateTimeToJson)
  final DateTime createdAt;
  @JsonKey(fromJson: _dateTimeFromJson, toJson: _dateTimeToJson)
  final DateTime updatedAt;

  CallListItem({
    required this.id,
    required this.callListId,
    required this.studentId,
    this.assignedTo,
    this.callLogId,
    required this.state,
    required this.priority,
    required this.student,
    required this.createdAt,
    required this.updatedAt,
  });

  factory CallListItem.fromJson(Map<String, dynamic> json) =>
      _$CallListItemFromJson(json);
  Map<String, dynamic> toJson() => _$CallListItemToJson(this);

  static DateTime _dateTimeFromJson(dynamic value) {
    if (value is String) {
      return DateTime.parse(value);
    }
    return DateTime.now();
  }

  static String _dateTimeToJson(DateTime dateTime) {
    return dateTime.toIso8601String();
  }
}

