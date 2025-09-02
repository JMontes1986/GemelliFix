
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
  ticketsByZone: z.array(z.object({
    name: z.string(),
    total: z.number(),
  })).describe('An array of objects representing the number of tickets per zone.'),
  topRequesters: z.array(z.object({
    name: z.string(),
    total: z.number(),
  })).describe('An array of the top 5 users who request the most tickets.'),
  popularCategories: z.array(z.object({
    name: z.string(),
    total: z.number(),
  })).describe('An array of the top 5 most frequent ticket categories.'),
  ticketsByMonth: z.array(z.object({
    name: z.string().describe("Month abbreviation (e.g., 'Ene', 'Feb')."),
    total: z.number(),
  })).describe('An array showing the number of tickets created per month over the last 12 months.'),
  averageTimePerStage: z.array(z.object({
    name: z.string().describe("The name of the lifecycle stage (e.g., 'Abierto -> Asignado')."),
    time: z.number().describe('The average time in hours spent in this stage.'),
  })).describe('An array showing the average time a ticket spends in each status transition.'),
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
Analyze the following Key Performance Indicators (KPIs) and operational data from the maintenance dashboard and provide a concise executive summary.

Your summary should:
- Be written in Spanish.
- Start with a general overview of the current situation based on the main KPIs.
- Highlight key successes and areas of excellence.
- Point out areas of concern, potential bottlenecks, or trends that require attention, using the detailed data provided.
- Be encouraging and professional in tone.
- Use markdown for simple formatting like lists or bold text.

**Main KPIs:**
- **Total Open Tickets:** {{{openTickets}}}
- **Overdue Tickets:** {{{overdueTickets}}}
- **SLA Compliance:** {{{slaCompliance}}}%
- **Average Resolution Time (MTTR):** {{{averageResolutionTimeHours}}} hours

**Detailed Operational Data:**

- **Tickets by Zone:**
  {{#each ticketsByZone}}
  - {{name}}: {{total}} tickets
  {{/each}}

- **Top 5 Requesters:**
  {{#each topRequesters}}
  - {{name}}: {{total}} tickets
  {{/each}}

- **Top 5 Categories:**
  {{#each popularCategories}}
  - {{name}}: {{total}} tickets
  {{/each}}

- **Tickets Created (Last 12 Months):**
  {{#each ticketsByMonth}}
  - {{name}}: {{total}} tickets
  {{/each}}

- **Average Time per Stage (hours):**
  {{#each averageTimePerStage}}
  - {{name}}: {{time}} hours
  {{/each}}


**Analysis Guidelines:**
1.  **Start with the KPIs:** Give a high-level assessment. Are things under control? Is the number of overdue tickets a concern?
2.  **Analyze the details:**
    -   **Zones:** Is there a specific zone generating a disproportionate number of tickets? This could indicate a need for focused maintenance in that area.
    -   **Categories:** Are there recurring problems? For example, if "Electricidad" is the top category, it might signal a need for an electrical system review.
    -   **Requesters:** Is a single person creating many tickets? This is usually normal, but worth noting if it's an outlier.
    -   **Monthly Trend:** Is there a seasonal pattern? For example, more "Air Conditioning" tickets in summer.
    -   **Time per Stage:** Where are the bottlenecks? If "Asignado -> En Progreso" takes a long time, it might mean technicians are slow to start tasks. If "En Progreso -> Resuelto" is long, tasks might be more complex than estimated.
3.  **Synthesize and Conclude:** Combine your observations into a coherent summary. Offer actionable insights. For example: "The overall SLA is excellent at {{slaCompliance}}%. However, we see a high concentration of tickets in 'Bloque A', primarily in the 'Plomería' category. It would be wise to schedule a preventive maintenance review of the plumbing in that block. We also note that tickets spend a significant amount of time in the 'Asignado' state, suggesting we could improve our initial response time."

Based on all this data, generate a helpful and insightful summary.
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
