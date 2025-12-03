import 'package:json_annotation/json_annotation.dart';

part 'call_log.g.dart';

@JsonSerializable()
class CallLog {
  final String id;
  final String callListItemId;
  final String? studentId;
  final String assignedTo;
  final String status; // completed, missed, busy, noAnswer, voicemail, other
  final int? callDuration;
  final String? summaryNote;
  final String? callerNote;
  final String? notes;
  @JsonKey(fromJson: _dateTimeFromJson, toJson: _dateTimeToJson)
  final DateTime callDate;
  @JsonKey(fromJson: _dateTimeFromJson, toJson: _dateTimeToJson)
  final DateTime createdAt;
  @JsonKey(fromJson: _dateTimeFromJson, toJson: _dateTimeToJson)
  final DateTime updatedAt;

  CallLog({
    required this.id,
    required this.callListItemId,
    this.studentId,
    required this.assignedTo,
    required this.status,
    this.callDuration,
    this.summaryNote,
    this.callerNote,
    this.notes,
    required this.callDate,
    required this.createdAt,
    required this.updatedAt,
  });

  factory CallLog.fromJson(Map<String, dynamic> json) =>
      _$CallLogFromJson(json);
  Map<String, dynamic> toJson() => _$CallLogToJson(this);

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

@JsonSerializable()
class CallLogRequest {
  final String callListItemId;
  final String status;
  final int? callDuration;
  final String? notes;

  CallLogRequest({
    required this.callListItemId,
    required this.status,
    this.callDuration,
    this.notes,
  });

  Map<String, dynamic> toJson() => _$CallLogRequestToJson(this);
}

@JsonSerializable()
class MyCallsStats {
  final int total;
  final int completed;
  final int pending;
  final int queued;
  final int skipped;

  MyCallsStats({
    required this.total,
    required this.completed,
    required this.pending,
    required this.queued,
    required this.skipped,
  });

  factory MyCallsStats.fromJson(Map<String, dynamic> json) =>
      _$MyCallsStatsFromJson(json);
}

