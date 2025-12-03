import 'package:json_annotation/json_annotation.dart';

part 'student.g.dart';

enum StudentStatusType {
  @JsonValue('NEW')
  new_,
  @JsonValue('IN_PROGRESS')
  inProgress,
  @JsonValue('FOLLOW_UP')
  followUp,
  @JsonValue('CONVERTED')
  converted,
  @JsonValue('LOST')
  lost,
}

@JsonSerializable()
class Student {
  final String id;
  @JsonKey(fromJson: _stringFromJson)
  final String name;
  final String? email;
  @JsonKey(fromJson: _phonesFromJson)
  final List<PhoneNumber> phones;
  final List<String>? tags;
  final List<Enrollment>? enrollments;
  final List<StudentStatus>? statuses;
  @JsonKey(name: '_count')
  final StudentCounts? counts;
  final List<StudentBatch>? studentBatches;

  Student({
    required this.id,
    required this.name,
    this.email,
    List<PhoneNumber>? phones,
    this.tags,
    this.enrollments,
    this.statuses,
    this.counts,
    this.studentBatches,
  }) : phones = phones ?? [];

  factory Student.fromJson(Map<String, dynamic> json) =>
      _$StudentFromJson(json);
  Map<String, dynamic> toJson() => _$StudentToJson(this);

  static String _stringFromJson(dynamic value) {
    if (value == null) return '';
    if (value is String) return value;
    return value.toString();
  }

  static List<PhoneNumber> _phonesFromJson(dynamic value) {
    if (value == null) return [];
    if (value is List) {
      return value
          .map((e) => PhoneNumber.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }
}

@JsonSerializable()
class StudentCounts {
  final int calls;
  final int followups;

  StudentCounts({
    required this.calls,
    required this.followups,
  });

  factory StudentCounts.fromJson(Map<String, dynamic> json) =>
      _$StudentCountsFromJson(json);
  Map<String, dynamic> toJson() => _$StudentCountsToJson(this);
}

@JsonSerializable()
class StudentBatch {
  final String id;
  final BatchInfo? batch;

  StudentBatch({
    required this.id,
    this.batch,
  });

  factory StudentBatch.fromJson(Map<String, dynamic> json) =>
      _$StudentBatchFromJson(json);
  Map<String, dynamic> toJson() => _$StudentBatchToJson(this);
}

@JsonSerializable()
class BatchInfo {
  final String id;
  final String name;

  BatchInfo({
    required this.id,
    String? name,
  }) : name = name ?? '';

  factory BatchInfo.fromJson(Map<String, dynamic> json) =>
      _$BatchInfoFromJson(json);
  Map<String, dynamic> toJson() => _$BatchInfoToJson(this);
}

@JsonSerializable()
class PhoneNumber {
  final String id;
  final String number;
  @JsonKey(defaultValue: false)
  final bool isPrimary;

  PhoneNumber({
    required this.id,
    required this.number,
    bool? isPrimary,
  }) : isPrimary = isPrimary ?? false;

  factory PhoneNumber.fromJson(Map<String, dynamic> json) =>
      _$PhoneNumberFromJson(json);
  Map<String, dynamic> toJson() => _$PhoneNumberToJson(this);
}

@JsonSerializable()
class Enrollment {
  final String id;
  final String groupId;
  final GroupInfo? group;
  final CourseInfo? course;
  final bool isActive;

  Enrollment({
    required this.id,
    required this.groupId,
    this.group,
    this.course,
    required this.isActive,
  });

  factory Enrollment.fromJson(Map<String, dynamic> json) =>
      _$EnrollmentFromJson(json);
  Map<String, dynamic> toJson() => _$EnrollmentToJson(this);
}

@JsonSerializable()
class GroupInfo {
  final String id;
  final String name;

  GroupInfo({
    required this.id,
    String? name,
  }) : name = name ?? '';

  factory GroupInfo.fromJson(Map<String, dynamic> json) =>
      _$GroupInfoFromJson(json);
  Map<String, dynamic> toJson() => _$GroupInfoToJson(this);
}

@JsonSerializable()
class CourseInfo {
  final String id;
  final String name;

  CourseInfo({
    required this.id,
    String? name,
  }) : name = name ?? '';

  factory CourseInfo.fromJson(Map<String, dynamic> json) =>
      _$CourseInfoFromJson(json);
  Map<String, dynamic> toJson() => _$CourseInfoToJson(this);
}

@JsonSerializable()
class StudentStatus {
  final String id;
  final String groupId;
  final GroupInfo? group;
  @JsonKey(name: 'status')
  final StudentStatusType statusType;

  StudentStatus({
    required this.id,
    required this.groupId,
    this.group,
    required this.statusType,
  });

  factory StudentStatus.fromJson(Map<String, dynamic> json) =>
      _$StudentStatusFromJson(json);
  Map<String, dynamic> toJson() => _$StudentStatusToJson(this);
}

