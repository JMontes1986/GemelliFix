
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
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User } from '@/lib/types';

const SuggestTechnicianAssignmentInputSchema = z.object({
  ticketTitle: z.string().describe('The title of the maintenance ticket.'),
  ticketDescription: z.string().describe('The description of the maintenance ticket.'),
  ticketCategory: z.string().describe('The category of the maintenance ticket.'),
});
export type SuggestTechnicianAssignmentInput = z.infer<typeof SuggestTechnicianAssignmentInputSchema>;

const SuggestTechnicianAssignmentOutputSchema = z.object({
  technicianId: z.string().describe('The ID of the suggested technician.'),
  technicianName: z.string().describe('The name of the suggested technician.'),
  workloadPercentage: z.number().describe('The estimated workload percentage of the suggested technician. This is a placeholder and should be a random number for now.'),
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
            skills: z.array(z.string()).describe('A list of skills the technician has. This is a placeholder for now.'),
            workload: z.number().describe('The current workload percentage of the technician. This is a placeholder for now.'),
        })),
    },
    async () => {
        const q = query(collection(db, 'users'), where('role', '==', 'Servicios Generales'));
        const querySnapshot = await getDocs(q);
        const technicians = querySnapshot.docs.map(doc => {
            const data = doc.data() as User;
            return {
                id: data.id,
                name: data.name,
                skills: ['General', data.role], // Placeholder skills
                workload: Math.floor(Math.random() * 80) + 10, // Placeholder workload
            };
        });
        return technicians;
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
  prompt: `You are an AI assistant helping maintenance leaders to assign tickets to personnel.

Your goal is to suggest the best person for a new ticket based on their skills and current workload.

1.  **Analyze the Ticket**: Review the ticket's title, description, and category to understand the required skills.
    -   Title: {{{ticketTitle}}}
    -   Description: {{{ticketDescription}}}
    -   Category: {{{ticketCategory}}}

2.  **Get Personnel Data**: Use the \`getTechnicianList\` tool to get a list of all available personnel, including their skills and workload.

3.  **Find the Best Match**:
    -   Prioritize personnel whose skills match the ticket's category and description.
    -   Among those with the right skills, choose the one with the lowest workload.
    -   If multiple people have similar low workloads, any of them is a good choice.

4.  **Provide a Recommendation**:
    -   Fill in the \`technicianId\`, \`technicianName\`, and \`workloadPercentage\` fields.
    -   In the \`reason\` field, explain *why* you chose that person, mentioning their relevant skills and how their low workload makes them a good fit.
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

    