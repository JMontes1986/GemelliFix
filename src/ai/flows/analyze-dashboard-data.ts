
'use server';

/**
 * @fileOverview Analyzes dashboard metrics to provide an executive summary.
 *
 * - analyzeDashboardData - A function that analyzes key performance indicators.
 * - AnalyzeDashboardInput - The input type for the analyzeDashboardData function.
 * - AnalyzeDashboardOutput - The return type for the analyzeDashboardData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeDashboardInputSchema = z.object({
  openTickets: z.number().describe('The total number of currently open tickets.'),
  overdueTickets: z.number().describe('The number of tickets that are past their due date.'),
  slaCompliance: z.number().describe('The overall SLA compliance percentage (e.g., 95 for 95%).'),
  averageResolutionTimeHours: z.number().describe('The mean time to resolve tickets, in hours.'),
});
export type AnalyzeDashboardInput = z.infer<typeof AnalyzeDashboardInputSchema>;

const AnalyzeDashboardOutputSchema = z.object({
  summary: z.string().describe('A concise, insightful summary of the operational status based on the provided metrics. Use markdown for formatting.'),
});
export type AnalyzeDashboardOutput = z.infer<typeof AnalyzeDashboardOutputSchema>;

export async function analyzeDashboardData(input: AnalyzeDashboardInput): Promise<AnalyzeDashboardOutput> {
  return analyzeDashboardDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeDashboardPrompt',
  input: {schema: AnalyzeDashboardInputSchema},
  output: {schema: AnalyzeDashboardOutputSchema},
  prompt: `You are an expert maintenance operations manager.
Analyze the following Key Performance Indicators (KPIs) from the maintenance dashboard and provide a concise executive summary.

Your summary should:
- Be written in Spanish.
- Start with a general overview of the current situation.
- Highlight key successes and areas of excellence.
- Point out areas of concern or that require attention.
- Be encouraging and professional in tone.
- Use markdown for simple formatting like lists or bold text.

Here are the KPIs:
- **Total Open Tickets:** {{{openTickets}}}
- **Overdue Tickets:** {{{overdueTickets}}}
- **SLA Compliance:** {{{slaCompliance}}}%
- **Average Resolution Time (MTTR):** {{{averageResolutionTimeHours}}} hours

Based on these numbers, generate a helpful summary. For example, if overdue tickets are high, identify that as a risk. If SLA compliance is high, celebrate that success.
`,
});

const analyzeDashboardDataFlow = ai.defineFlow(
  {
    name: 'analyzeDashboardDataFlow',
    inputSchema: AnalyzeDashboardInputSchema,
    outputSchema: AnalyzeDashboardOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
