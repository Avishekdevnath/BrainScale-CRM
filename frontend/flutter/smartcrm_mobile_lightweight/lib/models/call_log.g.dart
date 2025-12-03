// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'call_log.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

CallLog _$CallLogFromJson(Map<String, dynamic> json) => CallLog(
      id: json['id'] as String,
      callListItemId: json['callListItemId'] as String,
      studentId: json['studentId'] as String?,
      assignedTo: json['assignedTo'] as String,
      status: json['status'] as String,
      callDuration: (json['callDuration'] as num?)?.toInt(),
      summaryNote: json['summaryNote'] as String?,
      callerNote: json['callerNote'] as String?,
      notes: json['notes'] as String?,
      callDate: CallLog._dateTimeFromJson(json['callDate']),
      createdAt: CallLog._dateTimeFromJson(json['createdAt']),
      updatedAt: CallLog._dateTimeFromJson(json['updatedAt']),
    );

Map<String, dynamic> _$CallLogToJson(CallLog instance) => <String, dynamic>{
      'id': instance.id,
      'callListItemId': instance.callListItemId,
      'studentId': instance.studentId,
      'assignedTo': instance.assignedTo,
      'status': instance.status,
      'callDuration': instance.callDuration,
      'summaryNote': instance.summaryNote,
      'callerNote': instance.callerNote,
      'notes': instance.notes,
      'callDate': CallLog._dateTimeToJson(instance.callDate),
      'createdAt': CallLog._dateTimeToJson(instance.createdAt),
      'updatedAt': CallLog._dateTimeToJson(instance.updatedAt),
    };

CallLogRequest _$CallLogRequestFromJson(Map<String, dynamic> json) =>
    CallLogRequest(
      callListItemId: json['callListItemId'] as String,
      status: json['status'] as String,
      callDuration: (json['callDuration'] as num?)?.toInt(),
      notes: json['notes'] as String?,
    );

Map<String, dynamic> _$CallLogRequestToJson(CallLogRequest instance) =>
    <String, dynamic>{
      'callListItemId': instance.callListItemId,
      'status': instance.status,
      'callDuration': instance.callDuration,
      'notes': instance.notes,
    };

MyCallsStats _$MyCallsStatsFromJson(Map<String, dynamic> json) => MyCallsStats(
      total: MyCallsStats._intFromJson(json['totalAssigned']),
      completed: (json['completed'] as num).toInt(),
      pending: (json['pending'] as num).toInt(),
      queued: (json['queued'] as num?)?.toInt() ?? 0,
      skipped: (json['skipped'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$MyCallsStatsToJson(MyCallsStats instance) =>
    <String, dynamic>{
      'totalAssigned': instance.total,
      'completed': instance.completed,
      'pending': instance.pending,
      'queued': instance.queued,
      'skipped': instance.skipped,
    };
