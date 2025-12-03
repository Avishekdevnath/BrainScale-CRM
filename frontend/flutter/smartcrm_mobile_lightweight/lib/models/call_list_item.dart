import 'package:json_annotation/json_annotation.dart';
import 'student.dart';

part 'call_list_item.g.dart';

@JsonSerializable()
class CallListItem {
  final String id;
  @JsonKey(fromJson: _stringFromJson)
  final String callListId;
  @JsonKey(fromJson: _stringFromJson)
  final String studentId;
  final String? assignedTo;
  final String? callLogId;
  @JsonKey(fromJson: _stringFromJson)
  final String state; // QUEUED, CALLING, DONE, SKIPPED
  @JsonKey(defaultValue: 0)
  final int priority;
  @JsonKey(fromJson: _studentFromJson)
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
    int? priority,
    required this.student,
    required this.createdAt,
    required this.updatedAt,
  }) : priority = priority ?? 0;

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

  static String _stringFromJson(dynamic value) {
    if (value == null) return '';
    if (value is String) return value;
    return value.toString();
  }

  static Student _studentFromJson(dynamic value) {
    if (value == null) {
      // Return a minimal student if null
      return Student(
        id: '',
        name: 'Unknown',
        phones: [],
      );
    }
    if (value is Map<String, dynamic>) {
      return Student.fromJson(value);
    }
    // Fallback
    return Student(
      id: '',
      name: 'Unknown',
      phones: [],
    );
  }
}

