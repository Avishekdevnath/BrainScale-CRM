class ApiConfig {
  // TODO: Update with your backend URL
  static const String baseUrl = 'http://your-backend-url/api/v1';
  
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  
  // API Endpoints
  static const String loginEndpoint = '/auth/login';
  static const String registerEndpoint = '/auth/register';
  static const String refreshEndpoint = '/auth/refresh';
  static const String meEndpoint = '/auth/me';
  static const String plansEndpoint = '/plans';
  static const String workspacesEndpoint = '/workspaces';
  static const String myCallsEndpoint = '/my-calls';
  static const String myCallsStatsEndpoint = '/my-calls/stats';
  static const String callLogsEndpoint = '/call-logs';
  static const String dashboardKPIsEndpoint = '/dashboard/kpis';
  static const String dashboardRecentActivityEndpoint = '/dashboard/recent-activity';
  static const String studentsEndpoint = '/students';
}

