// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'call_list_item.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

CallListItem _$CallListItemFromJson(Map<String, dynamic> json) => CallListItem(
      id: json['id'] as String? ?? '',
      callListId: CallListItem._stringFromJson(json['callListId']),
      studentId: CallListItem._stringFromJson(json['studentId']),
      assignedTo: json['assignedTo'] as String?,
      callLogId: json['callLogId'] as String?,
      state: CallListItem._stringFromJson(json['state']),
      priority: (json['priority'] as num?)?.toInt() ?? 0,
      student: CallListItem._studentFromJson(json['student']),
      createdAt: CallListItem._dateTimeFromJson(json['createdAt']),
      updatedAt: CallListItem._dateTimeFromJson(json['updatedAt']),
    );

Map<String, dynamic> _$CallListItemToJson(CallListItem instance) =>
    <String, dynamic>{
      'id': instance.id,
      'callListId': instance.callListId,
      'studentId': instance.studentId,
      'assignedTo': instance.assignedTo,
      'callLogId': instance.callLogId,
      'state': instance.state,
      'priority': instance.priority,
      'student': instance.student,
      'createdAt': CallListItem._dateTimeToJson(instance.createdAt),
      'updatedAt': CallListItem._dateTimeToJson(instance.updatedAt),
    };
