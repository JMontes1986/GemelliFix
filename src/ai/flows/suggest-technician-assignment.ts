// use server'
'use server';

/**
 * @fileOverview Suggests technician assignments based on workload.
 *
 * - suggestTechnicianAssignment - A function that suggests technician assignments.
 * - SuggestTechnicianAssignmentInput - The input type for the suggestTechnicianAssignment function.
 * - SuggestTechnicianAssignmentOutput - The return type for the suggestTechnicianAssignment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTechnicianAssignmentInputSchema = z.object({
  ticketDescription: z.string().describe('The description of the maintenance ticket.'),
  activeTickets: z.number().describe('The number of active tickets assigned to the technician.'),
  scheduledShifts: z.number().describe('The number of scheduled shifts for the technician.'),
  cleaningTasks: z.number().describe('The number of cleaning tasks assigned to the technician.'),
});
export type SuggestTechnicianAssignmentInput = z.infer<typeof SuggestTechnicianAssignmentInputSchema>;

const SuggestTechnicianAssignmentOutputSchema = z.object({
  technicianId: z.string().describe('The ID of the suggested technician.'),
  workloadPercentage: z.number().describe('The estimated workload percentage of the suggested technician.'),
  reason: z.string().describe('The reason for suggesting this technician.'),
});
export type SuggestTechnicianAssignmentOutput = z.infer<typeof SuggestTechnicianAssignmentOutputSchema>;

export async function suggestTechnicianAssignment(input: SuggestTechnicianAssignmentInput): Promise<SuggestTechnicianAssignmentOutput> {
  return suggestTechnicianAssignmentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTechnicianAssignmentPrompt',
  input: {schema: SuggestTechnicianAssignmentInputSchema},
  output: {schema: SuggestTechnicianAssignmentOutputSchema},
  prompt: `You are an AI assistant helping maintenance leaders to assign tickets to technicians.

  Given the following information about a technician, suggest if they are a good fit for the ticket:

  Ticket Description: {{{ticketDescription}}}
  Active Tickets: {{{activeTickets}}}
  Scheduled Shifts: {{{scheduledShifts}}}
  Cleaning Tasks: {{{cleaningTasks}}}

  Consider the technician's workload based on the number of active tickets, scheduled shifts, and cleaning tasks.
  Suggest a technician who is not overloaded and has the capacity to handle the new ticket.
  Explain the reasoning for your suggestion in the reason field.
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
