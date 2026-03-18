import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

let notificationHandlerConfigured = false;

function isExpoGoRuntime() {
  const executionEnvironment = (Constants as { executionEnvironment?: string }).executionEnvironment;
  return Constants.appOwnership === 'expo' || executionEnvironment === 'storeClient';
}

function configureNotificationHandlerOnce(
  notificationsModule: typeof import('expo-notifications'),
) {
  if (notificationHandlerConfigured) {
    return;
  }
  notificationsModule.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBadge: true,
      shouldShowSound: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  notificationHandlerConfigured = true;
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }
  if (isExpoGoRuntime()) {
    return null;
  }

  try {
    const Notifications = await import('expo-notifications');
    configureNotificationHandlerOnce(Notifications);

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return null;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId ??
      undefined;

    const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return token.data ?? null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('removed from Expo Go')) {
      return null;
    }
    throw error;
  }
}
