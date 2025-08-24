import { google } from 'googleapis';
import { getAdminApp } from './firebaseAdmin';

// Esta función ahora depende de las variables de entorno directamente,
// al igual que la inicialización del Admin SDK.
const getServiceAccountCredentials = () => {
    try {
        const clientEmail = process.env.FB_CLIENT_EMAIL;
        const privateKey = process.env.FB_PRIVATE_KEY?.replace(/\\n/g, '\n');
        const calendarId = process.env.GOOGLE_CALENDAR_ID;
        
        if (!clientEmail || !privateKey || !calendarId) {
            throw new Error("Missing required environment variables for Google Calendar: FB_CLIENT_EMAIL, FB_PRIVATE_KEY, GOOGLE_CALENDAR_ID.");
        }
        
        return { clientEmail, privateKey, calendarId };
    } catch(error: any) {
        console.error("Failed to get Google service account credentials from environment variables:", error.message);
        throw new Error(`Failed to initialize Google Calendar client. ${error.message}`);
    }
};

const SCOPES = ['https://www.googleapis.com/auth/calendar'];


// Inicializa el cliente JWT para la API de Google Calendar
const getJwtClient = () => {
    try {
        const { clientEmail, privateKey } = getServiceAccountCredentials();
        return new google.auth.JWT(
            clientEmail,
            undefined,
            privateKey,
            SCOPES
        );
    } catch(error) {
        console.error("Could not create Google JWT client:", error);
        return null;
    }
};


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
  const jwtClient = getJwtClient();
  if (!jwtClient) {
    throw new Error('Google Calendar API client is not initialized. Please check credentials.');
  }

  const { calendarId } = getServiceAccountCredentials();

  const calendar = google.calendar({
    version: 'v3',
    auth: jwtClient,
  });

  try {
    const response = await calendar.events.insert({
      calendarId: calendarId,
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
    const jwtClient = getJwtClient();
    if (!jwtClient) {
        throw new Error('Google Calendar API client is not initialized. Please check credentials.');
    }
    
    const { calendarId } = getServiceAccountCredentials();

    const calendar = google.calendar({
      version: 'v3',
      auth: jwtClient,
    });

    try {
        const response = await calendar.events.list({
            calendarId: calendarId,
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
