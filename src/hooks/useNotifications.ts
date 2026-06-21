import { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

let Notifications: any = null;
if (Platform.OS !== 'web') {
  if (Constants.appOwnership === 'expo') {
    console.log('NOTE: Notifications are disabled in Expo Go (removed in SDK 53+). Create a Development Build to test notification features.');
  } else {
    try {
      Notifications = require('expo-notifications');
    } catch (e) {
      console.warn('Failed to load expo-notifications:', e);
    }
  }
}

export function useNotifications() {
  const requestPermissions = useCallback(async () => {
    if (Platform.OS === 'web' || !Notifications) return false;
    
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('lms-alerts', {
          name: 'LMS Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#208AEF',
        });
      }
      
      return finalStatus === 'granted';
    } catch (e) {
      console.warn('Failed to get notification permissions', e);
      return false;
    }
  }, []);

  const scheduleBookmarkAlert = useCallback(async (count: number) => {
    if (!Notifications) return;
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;
    
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🔥 Keep it Up!",
          body: `You have bookmarked ${count} courses. Time to start learning and achieve your goals!`,
          sound: true,
        },
        trigger: null, // immediate
      });
    } catch (e) {
      console.warn('Failed to schedule bookmark alert', e);
    }
  }, [requestPermissions]);

  const schedule24hReminder = useCallback(async () => {
    if (Platform.OS === 'web' || !Notifications) return;
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;
      
      // Cancel previous scheduled reminder
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      // Schedule a new reminder for 24 hours from now
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "📚 Time to Learn!",
          body: "You haven't opened the LMS App in 24 hours. Jump back in to continue your courses!",
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 24 * 3600, // 24 hours
        },
      });
      // 24h reminder scheduled successfully
    } catch (err) {
      // Failed to schedule 24h reminder
    }
  }, [requestPermissions]);

  useEffect(() => {
    if (Platform.OS === 'web' || !Notifications) return;
    
    // Notification listener for foreground alerts
    const notificationListener = Notifications.addNotificationReceivedListener(() => {
      // Handle foreground notification
    });

    // Response listener (triggers when user taps notification)
    const responseListener = Notifications.addNotificationResponseReceivedListener(() => {
      // Handle notification click response
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  return {
    requestPermissions,
    scheduleBookmarkAlert,
    schedule24hReminder,
  };
}
