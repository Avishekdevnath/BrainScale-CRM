import 'package:json_annotation/json_annotation.dart';

part 'plan.g.dart';

@JsonSerializable()
class Plan {
  final String id;
  final String name;
  final double price;
  final String duration; // 'monthly' or 'yearly'
  final String? description;
  final List<String> features;
  final bool isPopular;
  final int? maxUsers;
  final int? maxCalls;
  @JsonKey(fromJson: _dateTimeFromJson, toJson: _dateTimeToJson)
  final DateTime? createdAt;

  Plan({
    required this.id,
    required this.name,
    required this.price,
    required this.duration,
    this.description,
    required this.features,
    this.isPopular = false,
    this.maxUsers,
    this.maxCalls,
    this.createdAt,
  });

  factory Plan.fromJson(Map<String, dynamic> json) => _$PlanFromJson(json);
  Map<String, dynamic> toJson() => _$PlanToJson(this);

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
}

