import 'package:url_launcher/url_launcher.dart';

class PhoneHandler {
  static Future<bool> makeCall(String phoneNumber) async {
    final Uri phoneUri = Uri(scheme: 'tel', path: phoneNumber);
    
    if (await canLaunchUrl(phoneUri)) {
      return await launchUrl(phoneUri);
    }
    return false;
  }
}

