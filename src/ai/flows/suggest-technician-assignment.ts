
'use server';

/**
 * @fileOverview Suggests technician assignments based on ticket details and technician skills.
 *
 * - suggestTechnicianAssignment - A function that suggests technician assignments.
 * - SuggestTechnicianAssignmentInput - The input type for the suggestTechnicianAssignment function.
 * - SuggestTechnicianAssignmentOutput - The return type for the suggestTechnicianAssignment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { technicians } from '@/lib/data';
import type { Technician } from '@/lib/types';

const SuggestTechnicianAssignmentInputSchema = z.object({
  ticketTitle: z.string().describe('The title of the maintenance ticket.'),
  ticketDescription: z.string().describe('The description of the maintenance ticket.'),
  ticketCategory: z.string().describe('The category of the maintenance ticket.'),
});
export type SuggestTechnicianAssignmentInput = z.infer<typeof SuggestTechnicianAssignmentInputSchema>;

const SuggestTechnicianAssignmentOutputSchema = z.object({
  technicianId: z.string().describe('The ID of the suggested technician.'),
  technicianName: z.string().describe('The name of the suggested technician.'),
  workloadPercentage: z.number().describe('The estimated workload percentage of the suggested technician.'),
  reason: z.string().describe('The reason for suggesting this technician, considering their skills and workload.'),
});
export type SuggestTechnicianAssignmentOutput = z.infer<typeof SuggestTechnicianAssignmentOutputSchema>;


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
        // In a real scenario, this would fetch data from a database.
        return technicians.map(t => ({ id: t.id, name: t.name, skills: t.skills, workload: t.workload }));
    }
);


export async function suggestTechnicianAssignment(input: SuggestTechnicianAssignmentInput): Promise<SuggestTechnicianAssignmentOutput> {
  return suggestTechnicianAssignmentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTechnicianAssignmentPrompt',
  input: {schema: SuggestTechnicianAssignmentInputSchema},
  output: {schema: SuggestTechnicianAssignmentOutputSchema},
  tools: [techniciansTool],
  prompt: `You are an AI assistant helping maintenance leaders to assign tickets to technicians.

Your goal is to suggest the best technician for a new ticket based on their skills and current workload.

1.  **Analyze the Ticket**: Review the ticket's title, description, and category to understand the required skills.
    -   Title: {{{ticketTitle}}}
    -   Description: {{{ticketDescription}}}
    -   Category: {{{ticketCategory}}}

2.  **Get Technician Data**: Use the \`getTechnicianList\` tool to get a list of all available technicians, including their skills and workload.

3.  **Find the Best Match**:
    -   Prioritize technicians whose skills match the ticket's category and description.
    -   Among those with the right skills, choose the one with the lowest workload.
    -   If multiple technicians have similar low workloads, any of them is a good choice.

4.  **Provide a Recommendation**:
    -   Fill in the \`technicianId\`, \`technicianName\`, and \`workloadPercentage\` fields.
    -   In the \`reason\` field, explain *why* you chose that technician, mentioning their relevant skills and how their low workload makes them a good fit.
`,
});

const suggestTechnicianAssignmentFlow = ai.defineFlow(
  {
    name: 'suggestTechnicianAssignmentFlow',
    inputSchema: SuggestTechnicianAssignmentInputSchema,
    outputSchema: SuggestTechnicianAssignmentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
