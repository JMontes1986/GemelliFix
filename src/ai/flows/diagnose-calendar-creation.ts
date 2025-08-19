
'use server';

/**
 * @fileOverview Diagnoses Firebase calendar event creation issues using an AI model.
 *
 * This flow analyzes a Firebase error related to creating a document in the
 * 'scheduleEvents' collection and provides a diagnosis and solution.
 *
 * - diagnoseCalendarCreation - A function that analyzes the error.
 * - CalendarErrorInput - The input type for the function.
 * - CalendarDiagnosisOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CalendarErrorInputSchema = z.object({
  errorCode: z.string().optional().describe('The error code returned by Firebase (e.g., "permission-denied").'),
  errorMessage: z.string().optional().describe('The full error message returned by Firebase.'),
});
export type CalendarErrorInput = z.infer<typeof CalendarErrorInputSchema>;

const CalendarDiagnosisOutputSchema = z.object({
  analysis: z.string().describe("A clear, concise analysis of what the root cause of the error is."),
  suggestedSteps: z.string().describe("A list of actionable steps the user should take to fix the issue. Use markdown for lists."),
});
export type CalendarDiagnosisOutput = z.infer<typeof CalendarDiagnosisOutputSchema>;

export async function diagnoseCalendarCreation(input: CalendarErrorInput): Promise<CalendarDiagnosisOutput> {
  return diagnoseCalendarCreationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'diagnoseCalendarPrompt',
  input: {schema: CalendarErrorInputSchema},
  output: {schema: CalendarDiagnosisOutputSchema},
  prompt: `You are a senior Firebase expert specializing in troubleshooting Firestore database rules for web applications.
A user is running a diagnostic test to create an event in their calendar, which involves writing to the 'scheduleEvents' collection in Firestore. The test failed.

Analyze the provided Firebase error information to determine the root cause.
Based on your analysis, provide a clear explanation and a step-by-step guide to resolve the issue.

Error Code: {{{errorCode}}}
Error Message: {{{errorMessage}}}

Focus on the most common causes for this specific error ('permission-denied' when writing to 'scheduleEvents') in a Next.js / React environment.

1.  **If the error is 'permission-denied'**: This is almost always a problem with Firestore Security Rules.
    -   **Analysis**: Explain that the current security rules in 'firestore.rules' do not allow the currently logged-in user to write to the 'scheduleEvents' collection.
    -   **Suggested Steps**:
        1.  Instruct the user to open the \`firestore.rules\` file.
        2.  Tell them to find the section for \`match /scheduleEvents/{eventId}\`.
        3.  Provide them with a corrected rule block that allows writes if the user is authenticated. A simple and effective rule is \`allow create: if request.auth != null;\`. Explain that this rule allows any logged-in user to create an event.
        4.  Mention that for more advanced security, they could restrict creation to certain roles (e.g., 'Administrador'), but the provided rule is a good starting point to make it work. Example: \`allow create: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Administrador';\`

2.  **If the error is 'unauthenticated'**:
    -   **Analysis**: The user is not properly logged in, so Firebase is correctly denying access.
    -   **Suggested Steps**: Instruct the user to log out and log back in, ensuring their session is active.

3.  **If the error is anything else (or not provided)**:
    -   **Analysis**: The issue might be related to the data format being sent or a more general problem.
    -   **Suggested Steps**:
        1.  Advise checking the browser's developer console for more detailed error messages.
        2.  Suggest verifying that the event object being created has all the required fields and that date/time values are in the correct ISO string format.

Provide the output in a structured format with an analysis and suggested steps.
`,
});

const diagnoseCalendarCreationFlow = ai.defineFlow(
  {
    name: 'diagnoseCalendarCreationFlow',
    inputSchema: CalendarErrorInputSchema,
    outputSchema: CalendarDiagnosisOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
