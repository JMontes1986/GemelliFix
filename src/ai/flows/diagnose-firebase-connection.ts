
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
  prompt: `You are a senior Firebase expert specializing in troubleshooting web application connectivity issues for both client-side and server-side (admin) environments.
A user is running a diagnostic test.

Analyze the provided Firebase error information or symptom description to determine the root cause.
Based on your analysis, provide a clear explanation and a step-by-step guide to resolve the issue.

Error Code: {{{errorCode}}}
Error Message: {{{errorMessage}}}
Symptom: {{{symptom}}}

Focus on the most common causes for this specific error in a Next.js / React environment.

- **If the symptom is that the connection hangs, times out, or never completes (neither success nor error)**, your primary suggestions MUST be:
  1.  **Analysis**: Explain that this is the most common symptom when the **Cloud Firestore database has not been created** in the Firebase Console.
  2.  **Suggested Steps**:
      -   Go to the Firestore Database section of the Firebase Console.
      -   Click "Create database" and complete the setup.
      -   Also mention checking the \`firebaseConfig\` object in the code to ensure it matches the Firebase project console.
      -   Finally, mention potential firewalls or network policies blocking Google Cloud services.

- **If the error message includes 'Server-side Firebase Admin credentials are not formatted correctly' or 'Failed to parse Firebase private key'**:
  1.  **Analysis**: Explain that this is a **backend error** related to the Firebase Admin SDK, not a client-side issue. The server is failing to authenticate itself with Google services because the private key is missing or malformed.
  2.  **SuggestedSteps**:
      -   Instruct the user to check their environment variables file (e.g., \`.env.local\`).
      -   Verify that the \`FB_PRIVATE_KEY\` variable exists.
      -   Explain that the private key must be copied **exactly** as it appears in the JSON file from Firebase, including the \`-----BEGIN PRIVATE KEY-----\` and \`-----END PRIVATE KEY-----\` lines.
      -   Emphasize that when storing it in an environment variable, newlines (\`\\n\`) must be preserved, often by wrapping the entire key in double quotes.

- **If the error is 'permission-denied'**: Your primary suggestion should be to check the Firestore security rules.

- **If the error is 'unauthenticated'**: Suggest checking the login status and ensuring the user is signed in before the operation.

- **If the error is generic or network-related**: Suggest checking the Firebase project configuration and the network connection.

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
    
