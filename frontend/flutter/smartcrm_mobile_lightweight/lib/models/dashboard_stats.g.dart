// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'dashboard_stats.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

DashboardKPIs _$DashboardKPIsFromJson(Map<String, dynamic> json) =>
    DashboardKPIs(
      overview:
          DashboardOverview.fromJson(json['overview'] as Map<String, dynamic>),
      activity:
          DashboardActivity.fromJson(json['activity'] as Map<String, dynamic>),
      followups: DashboardFollowups.fromJson(
          json['followups'] as Map<String, dynamic>),
      metrics:
          DashboardMetrics.fromJson(json['metrics'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$DashboardKPIsToJson(DashboardKPIs instance) =>
    <String, dynamic>{
      'overview': instance.overview,
      'activity': instance.activity,
      'followups': instance.followups,
      'metrics': instance.metrics,
    };

DashboardOverview _$DashboardOverviewFromJson(Map<String, dynamic> json) =>
    DashboardOverview(
      totalStudents: (json['totalStudents'] as num).toInt(),
      totalCalls: (json['totalCalls'] as num).toInt(),
      totalFollowups: (json['totalFollowups'] as num).toInt(),
      totalGroups: (json['totalGroups'] as num).toInt(),
      totalCourses: (json['totalCourses'] as num).toInt(),
    );

Map<String, dynamic> _$DashboardOverviewToJson(DashboardOverview instance) =>
    <String, dynamic>{
      'totalStudents': instance.totalStudents,
      'totalCalls': instance.totalCalls,
      'totalFollowups': instance.totalFollowups,
      'totalGroups': instance.totalGroups,
      'totalCourses': instance.totalCourses,
    };

DashboardActivity _$DashboardActivityFromJson(Map<String, dynamic> json) =>
    DashboardActivity(
      callsToday: (json['callsToday'] as num).toInt(),
      callsThisWeek: (json['callsThisWeek'] as num).toInt(),
      callsThisMonth: (json['callsThisMonth'] as num).toInt(),
      activeCalls: (json['activeCalls'] as num).toInt(),
    );

Map<String, dynamic> _$DashboardActivityToJson(DashboardActivity instance) =>
    <String, dynamic>{
      'callsToday': instance.callsToday,
      'callsThisWeek': instance.callsThisWeek,
      'callsThisMonth': instance.callsThisMonth,
      'activeCalls': instance.activeCalls,
    };

DashboardFollowups _$DashboardFollowupsFromJson(Map<String, dynamic> json) =>
    DashboardFollowups(
      pending: (json['pending'] as num).toInt(),
      overdue: (json['overdue'] as num).toInt(),
      total: (json['total'] as num).toInt(),
    );

Map<String, dynamic> _$DashboardFollowupsToJson(DashboardFollowups instance) =>
    <String, dynamic>{
      'pending': instance.pending,
      'overdue': instance.overdue,
      'total': instance.total,
    };

DashboardMetrics _$DashboardMetricsFromJson(Map<String, dynamic> json) =>
    DashboardMetrics(
      conversionRate: (json['conversionRate'] as num).toDouble(),
      averageCallsPerDay: (json['averageCallsPerDay'] as num).toDouble(),
    );

Map<String, dynamic> _$DashboardMetricsToJson(DashboardMetrics instance) =>
    <String, dynamic>{
      'conversionRate': instance.conversionRate,
      'averageCallsPerDay': instance.averageCallsPerDay,
    };

ActivityItem _$ActivityItemFromJson(Map<String, dynamic> json) => ActivityItem(
      id: json['id'] as String,
      type: json['type'] as String,
      date: ActivityItem._dateTimeFromJson(json['date']),
      studentName: json['studentName'] as String,
      groupName: json['groupName'] as String,
      status: json['status'] as String,
      description: json['description'] as String,
    );

Map<String, dynamic> _$ActivityItemToJson(ActivityItem instance) =>
    <String, dynamic>{
      'id': instance.id,
      'type': instance.type,
      'date': ActivityItem._dateTimeToJson(instance.date),
      'studentName': instance.studentName,
      'groupName': instance.groupName,
      'status': instance.status,
      'description': instance.description,
    };
