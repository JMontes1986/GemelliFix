
'use server';

/**
 * @fileOverview A secure gateway to create Google Calendar events from client components.
 * This flow ensures that server-side credentials and logic are never exposed to the client.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { createGoogleCalendarEvent as createEventInGoogle } from '@/lib/google-calendar';

// Define the input schema for creating a calendar event
const CreateCalendarEventInputSchema = z.object({
    summary: z.string().describe('The title or summary of the event.'),
    description: z.string().describe('A detailed description of the event.'),
    start: z.object({
        dateTime: z.string().describe('The start time of the event in ISO 8601 format.'),
        timeZone: z.string().describe('The time zone for the event (e.g., "America/Bogota").'),
    }),
    end: z.object({
        dateTime: z.string().describe('The end time of the event in ISO 8601 format.'),
        timeZone: z.string().describe('The time zone for the event (e.g., "America/Bogota").'),
    }),
});
export type CreateCalendarEventInput = z.infer<typeof CreateCalendarEventInputSchema>;

// Define the output schema, which will be the result from the Google Calendar API
const CreateCalendarEventOutputSchema = z.any();
export type CreateCalendarEventOutput = z.infer<typeof CreateCalendarEventOutputSchema>;


/**
 * A server-side flow that securely creates a Google Calendar event.
 * Client components should call this function instead of the google-calendar library directly.
 * @param input The event details.
 * @returns The result from the Google Calendar API.
 */
export async function createCalendarEvent(input: CreateCalendarEventInput): Promise<CreateCalendarEventOutput> {
  return createCalendarEventFlow(input);
}


const createCalendarEventFlow = ai.defineFlow(
  {
    name: 'createCalendarEventFlow',
    inputSchema: CreateCalendarEventInputSchema,
    outputSchema: CreateCalendarEventOutputSchema,
  },
  async (input) => {
    // This flow simply acts as a secure wrapper around our actual Google Calendar logic.
    // By doing this, we ensure the googleapis library is only ever executed on the server.
    try {
        // const result = await createEventInGoogle(input);
        // return result;
        return { "message": "Google Calendar integration is disabled on the Spark plan." }
    } catch (error) {
        // Log the error on the server and re-throw a generic error to the client.
        console.error("[createCalendarEventFlow] Error:", error);
        throw new Error("A server-side error occurred while creating the calendar event.");
    }
  }
);
