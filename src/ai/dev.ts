
import { config } from 'dotenv';
config(); // Carga las variables de entorno primero

// This file is for running Genkit in development mode.
// It is not part of the Next.js application build.
import { firebase } from '@genkit-ai/firebase';

import '@/ai/flows/suggest-technician-assignment.ts';
import '@/ai/flows/diagnose-firebase-connection.ts';
import '@/ai/flows/analyze-dashboard-data.ts';
import '@/ai/flows/suggest-calendar-assignment.ts';
import '@/ai/flows/suggest-ticket-state-change.ts';
import '@/ai/flows/suggest-ticket-details.ts';
import '@/ai/flows/diagnose-calendar-creation.ts';
import '@/ai/flows/create-calendar-event.ts';
import '@/ai/flows/ask-ai-assistant.ts';
import '@/ai/flows/diagnose-requester-access.ts';
import '@/ai/flows/suggest-ticket-title.ts';

// This is the developer UI and flow server for Genkit.
// It is not the Next.js dev handler.
export default {
    plugins: [firebase()],
    port: 9002
};
