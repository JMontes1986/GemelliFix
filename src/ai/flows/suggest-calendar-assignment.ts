
'use server';

/**
 * @fileOverview Suggests an optimal calendar assignment for a given ticket.
 *
 * This flow analyzes a ticket, a target technician, and a desired time,
 * and suggests the best assignment, potentially recommending a different
 * technician or time to optimize for skills and workload.
 *
 * - suggestCalendarAssignment - A function that handles the assignment suggestion.
 * - SuggestCalendarAssignmentInput - The input type for the function.
 * - SuggestCalendarAssignmentOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { technicians } from '@/lib/data';
import type { Technician, Ticket } from '@/lib/types';

// Define input schema
const SuggestCalendarAssignmentInputSchema = z.object({
  ticket: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    category: z.string(),
  }).describe('The ticket that needs to be scheduled.'),
  targetDate: z.string().describe('The ISO 8601 string of the desired date and time for the assignment.'),
  targetTechnicianId: z.string().describe('The ID of the technician the user wants to assign the ticket to.'),
});
export type SuggestCalendarAssignmentInput = z.infer<typeof SuggestCalendarAssignmentInputSchema>;

// Define output schema
const SuggestCalendarAssignmentOutputSchema = z.object({
    ticket: z.object({
        id: z.string(),
        title: z.string(),
        description: z.string(),
    }),
    technician: z.object({
        id: z.string(),
        name: z.string(),
    }),
    suggestedTime: z.string().describe("The suggested start time for the assignment in ISO 8601 format."),
    reason: z.string().describe("A clear and concise explanation for the suggestion, explaining why the chosen technician and time are optimal."),
});
export type SuggestCalendarAssignmentOutput = z.infer<typeof SuggestCalendarAssignmentOutputSchema>;

// Define the tool to get technician data
const techniciansTool = ai.defineTool(
    {
        name: 'getTechnicianList',
        description: 'Returns the list of available technicians with their skills and current workload.',
        outputSchema: z.array(z.object({
            id: z.string(),
            name: z.string(),
            skills: z.array(z.string()),
            workload: z.number(),
        })),
    },
    async () => {
        // In a real scenario, this would fetch data from a database including their availability.
        return technicians.map(t => ({ id: t.id, name: t.name, skills: t.skills, workload: t.workload }));
    }
);

// Define the main exported function
export async function suggestCalendarAssignment(input: SuggestCalendarAssignmentInput): Promise<SuggestCalendarAssignmentOutput> {
  return suggestCalendarAssignmentFlow(input);
}

// Define the prompt for the AI
const prompt = ai.definePrompt({
  name: 'suggestCalendarAssignmentPrompt',
  input: {schema: SuggestCalendarAssignmentInputSchema},
  output: {schema: SuggestCalendarAssignmentOutputSchema},
  tools: [techniciansTool],
  prompt: `You are an expert dispatcher for a maintenance company.
Your goal is to find the best possible assignment for a new ticket on the calendar.

A user has dragged a ticket onto the calendar, indicating a desired technician and time.
Analyze this request and provide the best recommendation.

**User's Request:**
- **Ticket to Assign:** "{{ticket.title}}" (Category: {{ticket.category}})
- **Desired Technician ID:** {{targetTechnicianId}}
- **Desired Time:** {{targetDate}}

**Your Task:**
1.  **Use the \`getTechnicianList\` tool** to get data on all available technicians, including their skills and current workload.
2.  **Analyze the Target Technician:**
    - Does the desired technician (ID: {{targetTechnicianId}}) have the right skills for the ticket's category ("{{ticket.category}}")?
    - How does their workload compare to others?
3.  **Find the Optimal Technician:**
    - Identify the technician who is the best fit. This is the technician with the **required skills** and the **lowest workload**.
4.  **Compare and Decide:**
    - **If the user's chosen technician IS the optimal choice:** Congratulate them on a good choice. Confirm their selected time is good (assuming it is, for now).
    - **If there is a BETTER technician available (better skills or much lower workload):** Politely suggest assigning the ticket to the better technician instead. Explain *why* they are a better fit (e.g., "Carlos Gomez has expertise in 'Electricidad' and has a lower workload.").
5.  **Format the Output:**
    - Populate the output fields with the ticket ID, the ID and name of the **best** technician, the suggested time (use the user's target time for this version), and a clear reason for your choice.
    - The reason should be helpful and justify your final recommendation.

Example Reason (if suggesting a change): "While Lucia is a great choice, Pedro Ramirez specializes in 'Sistemas' and has a lower workload (40%), making him a better fit for this task. I recommend assigning it to him at the same time."

Example Reason (if confirming): "Carlos Gomez is an excellent choice for this plumbing ticket as he has the right skills and available capacity. The suggested time works well with his schedule."
`,
});

// Define the Genkit flow
const suggestCalendarAssignmentFlow = ai.defineFlow(
  {
    name: 'suggestCalendarAssignmentFlow',
    inputSchema: SuggestCalendarAssignmentInputSchema,
    outputSchema: SuggestCalendarAssignmentOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);

    if (!output) {
      throw new Error("The AI failed to provide a suggestion.");
    }
    
    // Ensure the output has the correct structure.
    const finalSuggestion = {
        ...output,
        ticket: {
            id: input.ticket.id,
            title: input.ticket.title,
            description: input.ticket.description,
        }
    };
    
    return finalSuggestion;
  }
);

    