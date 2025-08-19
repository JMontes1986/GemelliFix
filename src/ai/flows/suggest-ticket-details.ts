
'use server';

/**
 * @fileOverview Suggests ticket details like category and priority based on user input.
 *
 * - suggestTicketDetails - A function that suggests ticket details.
 * - SuggestTicketDetailsInput - The input type for the suggestTicketDetails function.
 * - SuggestTicketDetailsOutput - The return type for the suggestTicketDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { categories } from '@/lib/data';

const SuggestTicketDetailsInputSchema = z.object({
  title: z.string().describe('The title of the maintenance ticket.'),
  description: z.string().describe('The description of the maintenance ticket.'),
});
export type SuggestTicketDetailsInput = z.infer<typeof SuggestTicketDetailsInputSchema>;

const SuggestTicketDetailsOutputSchema = z.object({
  category: z.string().describe('The suggested category for the ticket.'),
  priority: z.enum(['Baja', 'Media', 'Alta', 'Urgente']).describe('The suggested priority for the ticket.'),
  reasoning: z.string().describe('A brief explanation for the suggested category and priority.'),
});
export type SuggestTicketDetailsOutput = z.infer<typeof SuggestTicketDetailsOutputSchema>;

export async function suggestTicketDetails(input: SuggestTicketDetailsInput): Promise<SuggestTicketDetailsOutput> {
  return suggestTicketDetailsFlow(input);
}

const categoryList = categories.map(c => c.name).join(', ');

const prompt = ai.definePrompt({
  name: 'suggestTicketDetailsPrompt',
  input: {schema: SuggestTicketDetailsInputSchema},
  output: {schema: SuggestTicketDetailsOutputSchema},
  prompt: `You are an AI assistant for a school maintenance system called GemelliFix.
Your task is to analyze a user's maintenance request and suggest the most appropriate Category and Priority.

Analyze the user's request based on the title and description provided.

**Ticket Information:**
- Title: {{{title}}}
- Description: {{{description}}}

**Analysis Steps:**

1.  **Determine the Category:**
    -   Read the title and description to understand the nature of the problem.
    -   Choose the single best category from the following list that matches the request.
    -   Available Categories: ${categoryList}

2.  **Determine the Priority:**
    -   Based on keywords and context, estimate the urgency. Use the following guidelines:
        -   **Urgente:** For critical issues that affect safety or stop school operations (e.g., "power outage," "gas leak," "major flood," "security breach," "server down").
        -   **Alta:** For significant problems that disrupt activities but aren't complete emergencies (e.g., "broken AC in a full classroom," "no internet in the library," "only one toilet working").
        -   **Media:** For standard maintenance issues that need attention but aren't urgent (e.g., "broken chair," "flickering light," "leaky faucet," "software installation request").
        -   **Baja:** For minor issues, cosmetic fixes, or scheduled tasks (e.g., "paint scratch," "squeaky door," "request for new mousepad").

3.  **Provide Reasoning:**
    -   Write a short, helpful sentence in Spanish explaining your choices. For example: "Sugiero 'Electricidad' y prioridad 'Alta' porque un proyector que no funciona afecta directamente las clases."

**Output Format:**
-   Provide a response in the required JSON format with the suggested \`category\`, \`priority\`, and \`reasoning\`.
`,
});

const suggestTicketDetailsFlow = ai.defineFlow(
  {
    name: 'suggestTicketDetailsFlow',
    inputSchema: SuggestTicketDetailsInputSchema,
    outputSchema: SuggestTicketDetailsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
    