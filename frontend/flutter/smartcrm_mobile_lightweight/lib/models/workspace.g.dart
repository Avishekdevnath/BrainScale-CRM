// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'workspace.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Workspace _$WorkspaceFromJson(Map<String, dynamic> json) => Workspace(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      industry: json['industry'] as String?,
      planId: json['planId'] as String,
      ownerId: json['ownerId'] as String,
      memberCount: (json['memberCount'] as num?)?.toInt(),
      lastActive: Workspace._dateTimeFromJson(json['lastActive']),
      createdAt: Workspace._dateTimeFromJsonNonNull(json['createdAt']),
      updatedAt: Workspace._dateTimeFromJsonNonNull(json['updatedAt']),
    );

Map<String, dynamic> _$WorkspaceToJson(Workspace instance) => <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'description': instance.description,
      'industry': instance.industry,
      'planId': instance.planId,
      'ownerId': instance.ownerId,
      'memberCount': instance.memberCount,
      'lastActive': Workspace._dateTimeToJson(instance.lastActive),
      'createdAt': Workspace._dateTimeToJsonNonNull(instance.createdAt),
      'updatedAt': Workspace._dateTimeToJsonNonNull(instance.updatedAt),
    };

WorkspaceRequest _$WorkspaceRequestFromJson(Map<String, dynamic> json) =>
    WorkspaceRequest(
      name: json['name'] as String,
      description: json['description'] as String?,
      industry: json['industry'] as String?,
      planId: json['planId'] as String?,
    );

Map<String, dynamic> _$WorkspaceRequestToJson(WorkspaceRequest instance) =>
    <String, dynamic>{
      'name': instance.name,
      'description': instance.description,
      'industry': instance.industry,
      'planId': instance.planId,
    };
