import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import { Medication } from '../types';

const CALENDAR_TITLE = 'Health App Reminders';
const CALENDAR_COLOR = '#379777'; // Primary Green
const CALENDAR_NAME = 'HealthAppReminders';

/**
 * Request calendar permissions.
 */
export const requestCalendarPermissions = async (): Promise<boolean> => {
  const { status: calendarStatus } = await Calendar.requestCalendarPermissionsAsync();
  if (calendarStatus !== 'granted') return false;

  if (Platform.OS === 'ios') {
    const { status: remindersStatus } = await Calendar.requestRemindersPermissionsAsync();
    return remindersStatus === 'granted';
  }

  return true;
};

/**
 * Get or create the dedicated app calendar.
 */
const getAppCalendarId = async (): Promise<string | null> => {
  try {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const appCalendar = calendars.find(
      (c) => c.title === CALENDAR_TITLE || c.name === CALENDAR_NAME,
    );

    if (appCalendar) {
      return appCalendar.id;
    }

    return await createCalendar();
  } catch (error) {
    console.error('[CalendarService] Error getting/creating calendar:', error);
    return null;
  }
};

/**
 * Create a new calendar for the app.
 */
const createCalendar = async (): Promise<string | null> => {
  try {
    const defaultCalendarSource =
      Platform.OS === 'ios'
        ? await getDefaultCalendarSource()
        : { isLocalAccount: true, name: CALENDAR_NAME, type: Calendar.CalendarType.LOCAL };

    if (!defaultCalendarSource) {
      throw new Error('Could not find a default calendar source');
    }

    const newCalendarId = await Calendar.createCalendarAsync({
      title: CALENDAR_TITLE,
      color: CALENDAR_COLOR,
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: defaultCalendarSource.id,
      source: defaultCalendarSource,
      name: CALENDAR_NAME,
      ownerAccount: 'personal',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });

    return newCalendarId;
  } catch (error) {
    console.error('[CalendarService] Error creating calendar:', error);
    return null;
  }
};

/**
 * Helper to get the default source on iOS.
 */
const getDefaultCalendarSource = async (): Promise<Calendar.Source | undefined> => {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const defaultCalendars = calendars.filter((each) => each.source.name === 'Default');
  return defaultCalendars.length > 0 ? defaultCalendars[0].source : calendars[0]?.source;
};

/**
 * Parse time string "HH:mm" or "HH:mm AM/PM" to hours and minutes.
 */
const parseTime = (timeStr: string): { hours: number; minutes: number } | null => {
  try {
    const date = new Date(`1970-01-01 ${timeStr}`);
    if (isNaN(date.getTime())) return null;
    return { hours: date.getHours(), minutes: date.getMinutes() };
  } catch {
    return null;
  }
};

/**
 * Map day string to Expo Calendar DayOfWeek.
 */
const mapDayToCalendarDay = (day: string): Calendar.DayOfTheWeek => {
  const normalized = day.toLowerCase().trim();
  if (normalized.startsWith('sun')) return Calendar.DayOfTheWeek.Sunday;
  if (normalized.startsWith('mon')) return Calendar.DayOfTheWeek.Monday;
  if (normalized.startsWith('tue')) return Calendar.DayOfTheWeek.Tuesday;
  if (normalized.startsWith('wed')) return Calendar.DayOfTheWeek.Wednesday;
  if (normalized.startsWith('thu')) return Calendar.DayOfTheWeek.Thursday;
  if (normalized.startsWith('fri')) return Calendar.DayOfTheWeek.Friday;
  if (normalized.startsWith('sat')) return Calendar.DayOfTheWeek.Saturday;
  return Calendar.DayOfTheWeek.Monday; // Default
};

/**
 * Deletes all events associated with a medication ID.
 */
export const removeMedicationReminders = async (medicationId: string): Promise<void> => {
  try {
    const calendarId = await getAppCalendarId();
    if (!calendarId) return;

    // Fetch events for the next year to find occurrences
    // Note: This is imperfect for recurring events if we don't have the original ID.
    // However, since we use a dedicated calendar, we can fetch all future events and filter by notes.
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    const events = await Calendar.getEventsAsync([calendarId], startDate, endDate);
    
    // Filter events that have the medicationId in the notes/description
    const targetEvents = events.filter(
      (e) => e.notes && e.notes.includes(`MedicationID: ${medicationId}`),
    );

    for (const event of targetEvents) {
      // For recurring events, deleting one instance might be tricky if we don't use the 'future' flag
      // but createEventAsync with recurrence returns a single ID for the series.
      // So deleting that ID deletes the series.
      await Calendar.deleteEventAsync(event.id, { futureEvent: true });
    }
  } catch (error) {
    console.error('[CalendarService] Error removing reminders:', error);
  }
};

/**
 * Schedule reminders for a medication.
 */
export const scheduleMedicationReminders = async (medication: Medication): Promise<void> => {
  try {
    const hasPermission = await requestCalendarPermissions();
    if (!hasPermission) {
      console.warn('[CalendarService] Permission denied');
      return;
    }

    // 1. Clean up old reminders
    await removeMedicationReminders(medication.id);

    // 2. Check if active
    if (!medication.is_active) return;

    const calendarId = await getAppCalendarId();
    if (!calendarId) return;

    // 3. Parse Time
    const time = parseTime(medication.scheduled_time);
    if (!time) {
      console.warn('[CalendarService] Invalid time format:', medication.scheduled_time);
      return;
    }

    // 4. Calculate Start Date
    const startDate = new Date();
    startDate.setHours(time.hours, time.minutes, 0, 0);

    // If time has passed today, start tomorrow (or let the recurrence handle it)
    // Actually, createEventAsync with recurrence needs a valid start date.
    if (startDate.getTime() < Date.now()) {
      startDate.setDate(startDate.getDate() + 1);
    }

    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + 15); // 15 min duration

    // 5. Construct Recurrence Rule
    let recurrenceRule: Calendar.RecurrenceRule = {
      frequency: Calendar.Frequency.DAILY,
      interval: 1,
    };

    if (medication.days_of_week && medication.days_of_week.length > 0) {
      const days = medication.days_of_week.map(mapDayToCalendarDay);
      // If 7 days, it's daily.
      if (medication.days_of_week.length < 7) {
        recurrenceRule = {
          frequency: Calendar.Frequency.WEEKLY,
          daysOfTheWeek: days.map(d => ({ dayOfTheWeek: d })),
        };
      }
    }

    // 6. Create Event
    await Calendar.createEventAsync(calendarId, {
      title: `Take ${medication.name}`,
      startDate: startDate,
      endDate: endDate,
      timeZone: 'Asia/Manila', // Or get from device
      location: 'Health App',
      notes: `Dosage: ${medication.dosage}\nMedicationID: ${medication.id}`,
      alarms: [{ relativeOffset: 0, method: Calendar.AlarmMethod.ALERT }],
      recurrenceRule,
    });

    console.log(`[CalendarService] Scheduled reminder for ${medication.name}`);

  } catch (error) {
    console.error('[CalendarService] Error scheduling reminders:', error);
  }
};
