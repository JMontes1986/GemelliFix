
'use server';

/**
 * @fileOverview Diagnoses access issues for requester roles (Docentes, etc.).
 *
 * This flow analyzes errors that occur when a non-admin user tries to view their
 * own tickets, which is a common point of failure if Firestore indexes are missing.
 *
 * - diagnoseRequesterAccess - A function that analyzes the error.
 * - RequesterAccessErrorInput - The input type for the function.
 * - RequesterAccessDiagnosisOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RequesterAccessErrorInputSchema = z.object({
  errorCode: z.string().optional().describe('The error code returned by Firebase (e.g., "failed-precondition").'),
  errorMessage: z.string().optional().describe('The full error message returned by Firebase.'),
});
export type RequesterAccessErrorInput = z.infer<typeof RequesterAccessErrorInputSchema>;

const RequesterAccessDiagnosisOutputSchema = z.object({
  analysis: z.string().describe("A clear, concise analysis of what the root cause of the error is."),
  suggestedSteps: z.string().describe("A list of actionable steps the user should take to fix the issue. Use markdown for lists."),
});
export type RequesterAccessDiagnosisOutput = z.infer<typeof RequesterAccessDiagnosisOutputSchema>;

export async function diagnoseRequesterAccess(input: RequesterAccessErrorInput): Promise<RequesterAccessDiagnosisOutput> {
  return diagnoseRequesterAccessFlow(input);
}

const prompt = ai.definePrompt({
  name: 'diagnoseRequesterAccessPrompt',
  input: {schema: RequesterAccessErrorInputSchema},
  output: {schema: RequesterAccessDiagnosisOutputSchema},
  prompt: `You are a senior Firebase expert specializing in troubleshooting Firestore database rules and indexes.
A user is running a diagnostic test to simulate fetching tickets for a non-admin role (like 'Docente' or 'Coordinador'). This test failed.

The query being tested is: \`query(collection(db, 'tickets'), where('requesterId', '==', currentUser.id), orderBy('createdAt', 'desc'))\`

Analyze the provided Firebase error information to determine the root cause.

Error Code: {{{errorCode}}}
Error Message: {{{errorMessage}}}

Focus on the most common causes for this specific error when a non-admin user tries to fetch their own data.

1.  **If the error code is 'failed-precondition'**: This is almost certainly a missing Firestore index.
    -   **Analysis**: Explain that Firestore needs a composite index to perform queries that filter by one field ('requesterId') and order by another ('createdAt'). Without this index, the query cannot be executed.
    -   **Suggested Steps**:
        1.  Instruct the user to open the \`firestore.indexes.json\` file.
        2.  Explain that they need to add a new index definition to the "indexes" array.
        3.  Provide the exact JSON block they need to add:
            \`\`\`json
            {
              "collectionGroup": "tickets",
              "queryScope": "COLLECTION",
              "fields": [
                { "fieldPath": "requesterId", "order": "ASCENDING" },
                { "fieldPath": "createdAt", "order": "DESCENDING" }
              ]
            }
            \`\`\`
        4.  Advise them to be careful to add a comma after the preceding index block if it's not the last one in the array.

2.  **If the error is 'permission-denied'**:
    -   **Analysis**: The current Firestore security rules do not allow a user to read from the 'tickets' collection, even if they are the requester.
    -   **Suggested Steps**:
        1.  Instruct the user to open the \`firestore.rules\` file.
        2.  Tell them to find the section for \`match /tickets/{ticketId}\`.
        3.  Suggest a rule that allows a user to read a ticket if they are authenticated and their UID matches the \`requesterId\` field of the document. Example rule:
            \`\`\`
            allow read: if request.auth != null && request.auth.uid == resource.data.requesterId;
            \`\`\`
        4.  Mention that they might want to combine this with other roles that can read all tickets (like 'Administrador' or 'SST').

3.  **For any other error**:
    -   **Analysis**: The issue might be a more general problem.
    -   **Suggested Steps**: Advise checking the browser's developer console for more detailed network errors or typos in the field names.

Provide the output in Spanish and in a structured format with a clear analysis and suggested steps.
`,
});

const diagnoseRequesterAccessFlow = ai.defineFlow(
  {
    name: 'diagnoseRequesterAccessFlow',
    inputSchema: RequesterAccessErrorInputSchema,
    outputSchema: RequesterAccessDiagnosisOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
