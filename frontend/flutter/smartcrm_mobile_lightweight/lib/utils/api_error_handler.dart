import 'dart:io';
import 'package:dio/dio.dart';

class ApiErrorHandler {
  static String getErrorMessage(Object error) {
    if (error is DioError) {
      final response = error.response;

      // Prefer backend-provided message when available
      final data = response?.data;
      if (data is Map<String, dynamic>) {
        final message = data['message'] ?? data['error'] ?? data['detail'];
        if (message is String && message.isNotEmpty) {
          return message;
        }
      }

      switch (error.type) {
        case DioErrorType.connectionTimeout:
        case DioErrorType.sendTimeout:
        case DioErrorType.receiveTimeout:
          return 'Request timed out. Please check your connection and try again.';
        case DioErrorType.badResponse:
          final status = response?.statusCode ?? 0;
          if (status == 401) {
            return 'Your session has expired or you are not authorized. Please log in again.';
          } else if (status == 403) {
            return 'You do not have permission to perform this action.';
          } else if (status == 404) {
            return 'The requested resource was not found.';
          } else if (status == 422) {
            return 'Some of the data you entered is not valid. Please review and try again.';
          } else if (status >= 500 && status < 600) {
            return 'The server is having trouble right now. Please try again later.';
          }
          return 'Unexpected server response. Please try again.';
        case DioErrorType.cancel:
          return 'Request was cancelled. Please try again.';
        case DioErrorType.unknown:
        default:
          if (error.error is SocketException) {
            return 'Unable to connect. Please check your internet connection.';
          }
          return 'Something went wrong. Please try again.';
      }
    }

    // Fallback for non-Dio errors
    final description = error.toString();
    if (description.isEmpty || description == 'Exception') {
      return 'Something went wrong. Please try again.';
    }
    return description;
  }
}


