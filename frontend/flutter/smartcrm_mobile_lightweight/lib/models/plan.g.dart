// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'plan.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Plan _$PlanFromJson(Map<String, dynamic> json) => Plan(
      id: json['id'] as String,
      name: json['name'] as String,
      price: (json['price'] as num).toDouble(),
      duration: json['duration'] as String,
      features:
          (json['features'] as List<dynamic>).map((e) => e as String).toList(),
      isPopular: json['isPopular'] as bool? ?? false,
      maxUsers: (json['maxUsers'] as num?)?.toInt(),
      maxCalls: (json['maxCalls'] as num?)?.toInt(),
      createdAt: Plan._dateTimeFromJson(json['createdAt']),
    );

Map<String, dynamic> _$PlanToJson(Plan instance) => <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'price': instance.price,
      'duration': instance.duration,
      'features': instance.features,
      'isPopular': instance.isPopular,
      'maxUsers': instance.maxUsers,
      'maxCalls': instance.maxCalls,
      'createdAt': Plan._dateTimeToJson(instance.createdAt),
    };
