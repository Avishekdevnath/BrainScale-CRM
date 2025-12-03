class AppConstants {
  // Storage Keys
  static const String accessTokenKey = 'access_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userKey = 'user';
  static const String selectedWorkspaceIdKey = 'selected_workspace_id';
  
  // Call Item States
  static const String stateQueued = 'QUEUED';
  static const String stateCalling = 'CALLING';
  static const String stateDone = 'DONE';
  static const String stateSkipped = 'SKIPPED';
  
  // Call Log Statuses
  static const String statusCompleted = 'completed';
  static const String statusMissed = 'missed';
  static const String statusBusy = 'busy';
  static const String statusNoAnswer = 'noAnswer';
  static const String statusVoicemail = 'voicemail';
  static const String statusOther = 'other';
}

