
'use server';

/**
 * @fileOverview Validates and suggests state changes for a maintenance ticket.
 *
 * This flow analyzes a ticket's current state, its due date, and the user's role
 * to either validate a requested state change or provide suggestions for overdue tickets.
 *
 * - suggestTicketStateChange - A function that handles the state change suggestion logic.
 * - SuggestTicketStateChangeInput - The input type for the function.
 * - SuggestTicketStateChangeOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { User } from '@/lib/types';

// Define input schema
const SuggestTicketStateChangeInputSchema = z.object({
  ticket: z.object({
    id: z.string(),
    status: z.string(),
    dueDate: z.string().describe("The ticket's due date in ISO 8601 format."),
    assignedTo: z.string().optional().describe("The name of the assigned technician."),
  }),
  currentUserRole: z.enum(['Administrador', 'Servicios Generales', 'Docentes', 'Coordinadores', 'Administrativos']).describe("The role of the user requesting the analysis."),
});
export type SuggestTicketStateChangeInput = z.infer<typeof SuggestTicketStateChangeInputSchema>;

// Define output schema
const SuggestTicketStateChangeOutputSchema = z.object({
    analysis: z.string().describe("A clear analysis of the ticket's situation. For overdue tickets, this should be a direct and urgent statement. For regular state checks, it should explain the context."),
    recommendation: z.string().describe("A concise, actionable recommendation. For overdue tickets, provide concrete next steps (e.g., reassign, contact technician). For regular checks, suggest the next logical status."),
    isActionable: z.boolean().describe("Whether the recommendation includes a direct action the user can take (like changing the status).")
});
export type SuggestTicketStateChangeOutput = z.infer<typeof SuggestTicketStateChangeOutputSchema>;

// Define the main exported function
export async function suggestTicketStateChange(input: SuggestTicketStateChangeInput): Promise<SuggestTicketStateChangeOutput> {
  return suggestTicketStateChangeFlow(input);
}

// Define the prompt for the AI
const prompt = ai.definePrompt({
  name: 'suggestTicketStatePrompt',
  input: {schema: SuggestTicketStateChangeInputSchema},
  output: {schema: SuggestTicketStateChangeOutputSchema},
  prompt: `You are an expert maintenance operations supervisor.
Your task is to analyze a maintenance ticket and provide guidance on its status.
The current date is ${new Date().toISOString()}.

**Ticket Information:**
- **Status:** {{ticket.status}}
- **Due Date:** {{ticket.dueDate}}
- **Assigned To:** {{ticket.assignedTo}}
- **User Role:** {{currentUserRole}}

**Your Analysis Task:**

1.  **Check if the ticket is overdue.** A ticket is overdue if the current date is past its \`dueDate\`.

2.  **If the ticket is OVERDUE:**
    -   Your tone must be **urgent and direct**.
    -   **Analysis:** State clearly that the ticket is overdue and by how long.
    -   **Recommendation:** Provide concrete, actionable steps. For example: "Contact the technician '{{ticket.assignedTo}}' immediately to get a status update," or "Consider reassigning this ticket to another technician due to the delay."
    -   Set \`isActionable\` to \`false\` as the primary action is investigation, not a simple state change.

3.  **If the ticket is NOT overdue:**
    -   Your tone should be **helpful and informative**.
    -   **Analyze the current status ({{ticket.status}}) and suggest the next logical step.**
    -   **Analysis:** Briefly explain the current state.
    -   **Recommendation:** Suggest the next valid status based on this logic:
        -   If status is 'Abierto': The next step is 'Asignado'.
        -   If status is 'Asignado': The next step is 'En Progreso'.
        -   If status is 'En Progreso': The next step is 'Resuelto'.
        -   If status is 'Resuelto': The next step is 'Cerrado'.
        -   If status is 'Requiere Aprobación': The next step for the requester is to approve it ('Cerrado') or reject it.
    -   Set \`isActionable\` to \`true\` if you are suggesting a direct state change.

Provide your response in Spanish.
`,
});

// Define the Genkit flow
const suggestTicketStateChangeFlow = ai.defineFlow(
  {
    name: 'suggestTicketStateChangeFlow',
    inputSchema: SuggestTicketStateChangeInputSchema,
    outputSchema: SuggestTicketStateChangeOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);

    if (!output) {
      throw new Error("The AI failed to provide a suggestion for the ticket state.");
    }
    
    return output;
  }
);
    
