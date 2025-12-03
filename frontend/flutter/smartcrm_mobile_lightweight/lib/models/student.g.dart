// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'student.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Student _$StudentFromJson(Map<String, dynamic> json) => Student(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String?,
      phones: (json['phones'] as List<dynamic>)
          .map((e) => PhoneNumber.fromJson(e as Map<String, dynamic>))
          .toList(),
      tags: (json['tags'] as List<dynamic>?)?.map((e) => e as String).toList(),
      enrollments: (json['enrollments'] as List<dynamic>?)
          ?.map((e) => Enrollment.fromJson(e as Map<String, dynamic>))
          .toList(),
      statuses: (json['statuses'] as List<dynamic>?)
          ?.map((e) => StudentStatus.fromJson(e as Map<String, dynamic>))
          .toList(),
      counts: json['_count'] == null
          ? null
          : StudentCounts.fromJson(json['_count'] as Map<String, dynamic>),
      studentBatches: (json['studentBatches'] as List<dynamic>?)
          ?.map((e) => StudentBatch.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

Map<String, dynamic> _$StudentToJson(Student instance) => <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'email': instance.email,
      'phones': instance.phones,
      'tags': instance.tags,
      'enrollments': instance.enrollments,
      'statuses': instance.statuses,
      '_count': instance.counts,
      'studentBatches': instance.studentBatches,
    };

StudentCounts _$StudentCountsFromJson(Map<String, dynamic> json) =>
    StudentCounts(
      calls: (json['calls'] as num).toInt(),
      followups: (json['followups'] as num).toInt(),
    );

Map<String, dynamic> _$StudentCountsToJson(StudentCounts instance) =>
    <String, dynamic>{
      'calls': instance.calls,
      'followups': instance.followups,
    };

StudentBatch _$StudentBatchFromJson(Map<String, dynamic> json) => StudentBatch(
      id: json['id'] as String,
      batch: json['batch'] == null
          ? null
          : BatchInfo.fromJson(json['batch'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$StudentBatchToJson(StudentBatch instance) =>
    <String, dynamic>{
      'id': instance.id,
      'batch': instance.batch,
    };

BatchInfo _$BatchInfoFromJson(Map<String, dynamic> json) => BatchInfo(
      id: json['id'] as String,
      name: json['name'] as String,
    );

Map<String, dynamic> _$BatchInfoToJson(BatchInfo instance) => <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
    };

PhoneNumber _$PhoneNumberFromJson(Map<String, dynamic> json) => PhoneNumber(
      id: json['id'] as String,
      number: json['number'] as String,
      isPrimary: json['isPrimary'] as bool,
    );

Map<String, dynamic> _$PhoneNumberToJson(PhoneNumber instance) =>
    <String, dynamic>{
      'id': instance.id,
      'number': instance.number,
      'isPrimary': instance.isPrimary,
    };

Enrollment _$EnrollmentFromJson(Map<String, dynamic> json) => Enrollment(
      id: json['id'] as String,
      groupId: json['groupId'] as String,
      group: json['group'] == null
          ? null
          : GroupInfo.fromJson(json['group'] as Map<String, dynamic>),
      course: json['course'] == null
          ? null
          : CourseInfo.fromJson(json['course'] as Map<String, dynamic>),
      isActive: json['isActive'] as bool,
    );

Map<String, dynamic> _$EnrollmentToJson(Enrollment instance) =>
    <String, dynamic>{
      'id': instance.id,
      'groupId': instance.groupId,
      'group': instance.group,
      'course': instance.course,
      'isActive': instance.isActive,
    };

GroupInfo _$GroupInfoFromJson(Map<String, dynamic> json) => GroupInfo(
      id: json['id'] as String,
      name: json['name'] as String,
    );

Map<String, dynamic> _$GroupInfoToJson(GroupInfo instance) => <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
    };

CourseInfo _$CourseInfoFromJson(Map<String, dynamic> json) => CourseInfo(
      id: json['id'] as String,
      name: json['name'] as String,
    );

Map<String, dynamic> _$CourseInfoToJson(CourseInfo instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
    };

StudentStatus _$StudentStatusFromJson(Map<String, dynamic> json) =>
    StudentStatus(
      id: json['id'] as String,
      groupId: json['groupId'] as String,
      group: json['group'] == null
          ? null
          : GroupInfo.fromJson(json['group'] as Map<String, dynamic>),
      statusType: $enumDecode(_$StudentStatusTypeEnumMap, json['status']),
    );

Map<String, dynamic> _$StudentStatusToJson(StudentStatus instance) =>
    <String, dynamic>{
      'id': instance.id,
      'groupId': instance.groupId,
      'group': instance.group,
      'status': _$StudentStatusTypeEnumMap[instance.statusType]!,
    };

const _$StudentStatusTypeEnumMap = {
  StudentStatusType.new_: 'NEW',
  StudentStatusType.inProgress: 'IN_PROGRESS',
  StudentStatusType.followUp: 'FOLLOW_UP',
  StudentStatusType.converted: 'CONVERTED',
  StudentStatusType.lost: 'LOST',
};
