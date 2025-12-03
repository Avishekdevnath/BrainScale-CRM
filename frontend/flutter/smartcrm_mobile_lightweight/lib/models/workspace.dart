import 'package:json_annotation/json_annotation.dart';

part 'workspace.g.dart';

@JsonSerializable()
class Workspace {
  final String id;
  final String name;
  final String? description;
  final String? industry;
  final String planId;
  final String ownerId;
  final int? memberCount;
  @JsonKey(fromJson: _dateTimeFromJson, toJson: _dateTimeToJson)
  final DateTime? lastActive;
  @JsonKey(fromJson: _dateTimeFromJsonNonNull, toJson: _dateTimeToJsonNonNull)
  final DateTime createdAt;
  @JsonKey(fromJson: _dateTimeFromJsonNonNull, toJson: _dateTimeToJsonNonNull)
  final DateTime updatedAt;

  Workspace({
    required this.id,
    required this.name,
    this.description,
    this.industry,
    required this.planId,
    required this.ownerId,
    this.memberCount,
    this.lastActive,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Workspace.fromJson(Map<String, dynamic> json) =>
      _$WorkspaceFromJson(json);
  Map<String, dynamic> toJson() => _$WorkspaceToJson(this);

  static DateTime? _dateTimeFromJson(dynamic value) {
    if (value == null) return null;
    if (value is String) {
      return DateTime.parse(value);
    }
    return null;
  }

  static String? _dateTimeToJson(DateTime? dateTime) {
    return dateTime?.toIso8601String();
  }

  static DateTime _dateTimeFromJsonNonNull(dynamic value) {
    if (value is String) {
      return DateTime.parse(value);
    }
    return DateTime.now();
  }

  static String _dateTimeToJsonNonNull(DateTime dateTime) {
    return dateTime.toIso8601String();
  }
}

@JsonSerializable()
class WorkspaceRequest {
  final String name;
  final String? description;
  final String? industry;
  final String? planId;

  WorkspaceRequest({
    required this.name,
    this.description,
    this.industry,
    this.planId,
  });

  Map<String, dynamic> toJson() => _$WorkspaceRequestToJson(this);
}

