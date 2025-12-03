import 'package:json_annotation/json_annotation.dart';

part 'dashboard_stats.g.dart';

@JsonSerializable()
class DashboardKPIs {
  final DashboardOverview overview;
  final DashboardActivity activity;
  final DashboardFollowups followups;
  final DashboardMetrics metrics;

  DashboardKPIs({
    required this.overview,
    required this.activity,
    required this.followups,
    required this.metrics,
  });

  factory DashboardKPIs.fromJson(Map<String, dynamic> json) =>
      _$DashboardKPIsFromJson(json);
  Map<String, dynamic> toJson() => _$DashboardKPIsToJson(this);
}

@JsonSerializable()
class DashboardOverview {
  final int totalStudents;
  final int totalCalls;
  final int totalFollowups;
  final int totalGroups;
  final int totalCourses;

  DashboardOverview({
    required this.totalStudents,
    required this.totalCalls,
    required this.totalFollowups,
    required this.totalGroups,
    required this.totalCourses,
  });

  factory DashboardOverview.fromJson(Map<String, dynamic> json) =>
      _$DashboardOverviewFromJson(json);
  Map<String, dynamic> toJson() => _$DashboardOverviewToJson(this);
}

@JsonSerializable()
class DashboardActivity {
  final int callsToday;
  final int callsThisWeek;
  final int callsThisMonth;
  final int activeCalls;

  DashboardActivity({
    required this.callsToday,
    required this.callsThisWeek,
    required this.callsThisMonth,
    required this.activeCalls,
  });

  factory DashboardActivity.fromJson(Map<String, dynamic> json) =>
      _$DashboardActivityFromJson(json);
  Map<String, dynamic> toJson() => _$DashboardActivityToJson(this);
}

@JsonSerializable()
class DashboardFollowups {
  final int pending;
  final int overdue;
  final int total;

  DashboardFollowups({
    required this.pending,
    required this.overdue,
    required this.total,
  });

  factory DashboardFollowups.fromJson(Map<String, dynamic> json) =>
      _$DashboardFollowupsFromJson(json);
  Map<String, dynamic> toJson() => _$DashboardFollowupsToJson(this);
}

@JsonSerializable()
class DashboardMetrics {
  final double conversionRate;
  final double averageCallsPerDay;

  DashboardMetrics({
    required this.conversionRate,
    required this.averageCallsPerDay,
  });

  factory DashboardMetrics.fromJson(Map<String, dynamic> json) =>
      _$DashboardMetricsFromJson(json);
  Map<String, dynamic> toJson() => _$DashboardMetricsToJson(this);
}

@JsonSerializable()
class ActivityItem {
  final String id;
  final String type; // 'call' | 'followup'
  @JsonKey(fromJson: _dateTimeFromJson, toJson: _dateTimeToJson)
  final DateTime date;
  final String studentName;
  final String groupName;
  final String status;
  final String description;

  ActivityItem({
    required this.id,
    required this.type,
    required this.date,
    required this.studentName,
    required this.groupName,
    required this.status,
    required this.description,
  });

  factory ActivityItem.fromJson(Map<String, dynamic> json) =>
      _$ActivityItemFromJson(json);
  Map<String, dynamic> toJson() => _$ActivityItemToJson(this);

  static DateTime _dateTimeFromJson(dynamic value) {
    if (value is String) {
      return DateTime.parse(value);
    }
    if (value is int) {
      return DateTime.fromMillisecondsSinceEpoch(value);
    }
    return DateTime.now();
  }

  static String _dateTimeToJson(DateTime dateTime) {
    return dateTime.toIso8601String();
  }
}

