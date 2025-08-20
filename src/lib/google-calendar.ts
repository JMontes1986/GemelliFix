import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;
const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;

if (!CALENDAR_ID || !privateKey || !clientEmail) {
  throw new Error(
    'Google Calendar API credentials are not set in environment variables. Please check your .env file.'
  );
}

// Initialize the JWT client
const jwtClient = new google.auth.JWT(
  clientEmail,
  undefined,
  privateKey,
  SCOPES
);

// Initialize the Calendar API client
const calendar = google.calendar({
  version: 'v3',
  auth: jwtClient,
});

/**
 * Creates an event in the configured Google Calendar.
 * @param event - The event object to create.
 * @returns The created event data from Google Calendar API.
 */
export async function createGoogleCalendarEvent(event: {
  summary: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
}) {
  try {
    const response = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: {
        ...event,
        // You can add default properties here, e.g., default reminders
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 10 },
          ],
        },
      },
    });
    console.log('Event created:', response.data.htmlLink);
    return response.data;
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    throw new Error('Failed to create event in Google Calendar.');
  }
}

/**
 * Lists events from the configured Google Calendar within a date range.
 * @param timeMin - The start date for the query (ISO string).
 * @param timeMax - The end date for the query (ISO string).
 * @returns A list of events from Google Calendar.
 */
export async function listGoogleCalendarEvents(timeMin: string, timeMax: string) {
    try {
        const response = await calendar.events.list({
            calendarId: CALENDAR_ID,
            timeMin,
            timeMax,
            singleEvents: true,
            orderBy: 'startTime',
        });
        return response.data.items;
    } catch (error) {
        console.error('Error fetching Google Calendar events:', error);
        throw new Error('Failed to fetch events from Google Calendar.');
    }
}
