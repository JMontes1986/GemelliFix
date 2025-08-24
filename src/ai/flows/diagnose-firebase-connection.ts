
'use server';

/**
 * @fileOverview Diagnoses Firebase connection issues using an AI model.
 *
 * - diagnoseFirebaseConnection - A function that analyzes a Firebase error or symptom and suggests a solution.
 * - FirebaseErrorInput - The input type for the diagnoseFirebaseConnection function.
 * - FirebaseDiagnosisOutput - The return type for the diagnoseFirebaseConnection function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FirebaseErrorInputSchema = z.object({
  errorCode: z.string().optional().describe('The error code returned by Firebase (e.g., "permission-denied").'),
  errorMessage: z.string().optional().describe('The full error message returned by Firebase.'),
  symptom: z.string().optional().describe('A description of the problem if there is no explicit error message (e.g., "Connection hangs indefinitely").')
});
export type FirebaseErrorInput = z.infer<typeof FirebaseErrorInputSchema>;

const FirebaseDiagnosisOutputSchema = z.object({
  analysis: z.string().describe("A clear, concise analysis of what the root cause of the error is."),
  suggestedSteps: z.string().describe("A list of actionable steps the user should take to fix the issue. Use markdown for lists."),
});
export type FirebaseDiagnosisOutput = z.infer<typeof FirebaseDiagnosisOutputSchema>;

export async function diagnoseFirebaseConnection(input: FirebaseErrorInput): Promise<FirebaseDiagnosisOutput> {
  return diagnoseFirebaseConnectionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'diagnoseFirebasePrompt',
  input: {schema: FirebaseErrorInputSchema},
  output: {schema: FirebaseDiagnosisOutputSchema},
  prompt: `You are a senior Firebase expert specializing in troubleshooting web application connectivity issues.
A user is running a diagnostic test.

Analyze the provided Firebase error information or symptom description to determine the root cause.
Based on your analysis, provide a clear explanation and a step-by-step guide to resolve the issue.

Error Code: {{{errorCode}}}
Error Message: {{{errorMessage}}}
Symptom: {{{symptom}}}

Focus on the most common causes for this specific error in a Next.js / React environment.
- If the symptom is that the connection hangs, times out, or never completes (neither success nor error), your primary suggestions MUST be:
  1.  **Check if the Firestore Database is created**: The most common reason for a hanging connection is that the database has not been created in the Firebase Console. The user must go to the Firestore Database section and click "Create database".
  2.  **Verify Project Configuration**: Ensure the \`firebaseConfig\` object in the code exactly matches the project configuration from the Firebase console.
  3.  **Network Issues**: Mention potential firewalls or network policies that might be blocking Google Cloud services.
- If the error is 'permission-denied', your primary suggestion should be to check the Firestore security rules.
- If the error is 'unauthenticated', suggest checking the login status and ensuring the user is signed in before the operation.
- If the error is generic or network-related, suggest checking the Firebase project configuration and the network connection.

Provide the output in a structured format with an analysis and suggested steps.
`,
});

const diagnoseFirebaseConnectionFlow = ai.defineFlow(
  {
    name: 'diagnoseFirebaseConnectionFlow',
    inputSchema: FirebaseErrorInputSchema,
    outputSchema: FirebaseDiagnosisOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
    