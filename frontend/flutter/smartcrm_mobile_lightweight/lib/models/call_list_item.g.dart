// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'call_list_item.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

CallListItem _$CallListItemFromJson(Map<String, dynamic> json) => CallListItem(
      id: json['id'] as String,
      callListId: json['callListId'] as String,
      studentId: json['studentId'] as String,
      assignedTo: json['assignedTo'] as String?,
      callLogId: json['callLogId'] as String?,
      state: json['state'] as String,
      priority: (json['priority'] as num).toInt(),
      student: Student.fromJson(json['student'] as Map<String, dynamic>),
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
