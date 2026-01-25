import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Medication } from '../types';

// Map day strings to Expo weekday numbers (Sun=1, Mon=2, ..., Sat=7)
const DAY_MAP: Record<string, number> = {
  Sun: 1,
  Mon: 2,
  Tue: 3,
  Wed: 4,
  Thu: 5,
  Fri: 6,
  Sat: 7,
};

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('medication-reminders', {
      name: 'Medication Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return false;
  }

  return true;
}

export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Cancels all notifications associated with a specific medication ID.
 * It searches for notifications with identifiers starting with "medication-{id}-".
 */
export async function cancelMedicationReminder(medicationId: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const targetPrefix = `medication-${medicationId}-`;

  const toCancel = scheduled.filter((n) => n.identifier.startsWith(targetPrefix));
  
  await Promise.all(toCancel.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

/**
 * Schedules weekly reminders for a medication based on its days_of_week and scheduled_time.
 * First cancels any existing reminders for this medication to prevent duplicates.
 */
export async function scheduleMedicationReminder(medication: Medication) {
  // 1. Cleanup existing
  await cancelMedicationReminder(medication.id);

  // 2. Check if active
  if (!medication.is_active) {
    return;
  }

  // 3. Parse time
  const [hourStr, minuteStr] = medication.scheduled_time.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  if (isNaN(hour) || isNaN(minute)) {
    console.warn(`Invalid time for medication ${medication.id}: ${medication.scheduled_time}`);
    return;
  }

  // 4. Schedule for each day
  const days = medication.days_of_week && medication.days_of_week.length > 0
    ? medication.days_of_week
    : Object.keys(DAY_MAP); // Default to all days if empty/undefined, or maybe we should default to none? 
                            // The app defaults to all days on creation, so we stick to what's in the object.

  for (const dayStr of days) {
    const weekday = DAY_MAP[dayStr];
    if (!weekday) continue;

    const identifier = `medication-${medication.id}-${weekday}`;
    
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Time to take ${medication.name}`,
          body: `${medication.dosage}`,
          sound: true,
          data: { medicationId: medication.id },
        },
        trigger: {
          weekday,
          hour,
          minute,
          repeats: true,
        },
        identifier,
      });
    } catch (e) {
        console.error(`Failed to schedule notification for ${identifier}:`, e);
    }
  }
}

/**
 * Reschedules a reminder. Alias for scheduleMedicationReminder since it handles cancellation internally.
 */
export const updateMedicationReminder = scheduleMedicationReminder;
