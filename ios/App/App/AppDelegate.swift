import UIKit
import Capacitor
import UserNotifications
import FirebaseCore
import FirebaseMessaging
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Configure Firebase with manual path check to avoid crash
        if let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
           let options = FirebaseOptions(contentsOfFile: path) {
            FirebaseApp.configure(options: options)
            print("✅ Firebase configured successfully")
            
            // Configure push notifications only if Firebase is ready
            UNUserNotificationCenter.current().delegate = self
            Messaging.messaging().delegate = self
            
            // Register for remote notifications
            application.registerForRemoteNotifications()
        } else {
            print("⚠️ GoogleService-Info.plist not found - Firebase disabled")
        }
        
        return true
    }

    // MARK: - Push Notifications
    
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        // Pass APNs token to Firebase - Firebase will exchange it for FCM token
        Messaging.messaging().apnsToken = deviceToken
        
        // Also notify Capacitor about the APNs token
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
        
        let tokenString = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        print("🔔 APNs token received: \(tokenString)")
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("❌ Failed to register for remote notifications: \(error)")
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }
    
    // MARK: - Firebase Messaging Delegate
    
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else { return }
        print("🔥 Firebase FCM token received: \(token)")
        
        // Store token in UserDefaults as backup
        UserDefaults.standard.set(token, forKey: "fcmToken")
        
        // Send FCM token to JavaScript via evaluateJavaScript
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
            if let webView = self?.window?.rootViewController?.view.subviews.compactMap({ $0 as? WKWebView }).first {
                let js = "window.dispatchEvent(new CustomEvent('fcmToken', { detail: '\(token)' }));"
                webView.evaluateJavaScript(js) { _, error in
                    if let error = error {
                        print("⚠️ Failed to send FCM token to JS: \(error)")
                    } else {
                        print("✅ FCM token sent to JavaScript")
                    }
                }
            }
        }
    }
    
    // Handle notification when app is in foreground
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        // Show notification even when app is in foreground
        completionHandler([.banner, .badge, .sound])
    }
    
    // Handle notification tap
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        // Let Capacitor handle the notification action
        NotificationCenter.default.post(name: Notification.Name("pushNotificationActionPerformed"), object: response)
        completionHandler()
    }

    // MARK: - App Lifecycle

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
