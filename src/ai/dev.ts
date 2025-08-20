import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-technician-assignment.ts';
import '@/ai/flows/diagnose-firebase-connection.ts';
import '@/ai/flows/analyze-dashboard-data.ts';
import '@/ai/flows/suggest-calendar-assignment.ts';
import '@/ai/flows/suggest-ticket-state-change.ts';
import '@/ai/flows/suggest-ticket-details.ts';
import '@/ai/flows/diagnose-calendar-creation.ts';
import '@/ai/flows/create-calendar-event.ts';
    