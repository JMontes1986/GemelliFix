
'use server';

/**
 * @fileOverview Suggests a standardized ticket title based on a detailed description.
 *
 * - suggestTicketTitle - A function that suggests a ticket title.
 * - SuggestTicketTitleInput - The input type for the function.
 * - SuggestTicketTitleOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestTicketTitleInputSchema = z.object({
  description: z.string().describe('The detailed description of the maintenance ticket problem.'),
});
export type SuggestTicketTitleInput = z.infer<typeof SuggestTicketTitleInputSchema>;

const SuggestTicketTitleOutputSchema = z.object({
  title: z.string().describe('A short, standardized, and descriptive title for the ticket, summarized from the description.'),
});
export type SuggestTicketTitleOutput = z.infer<typeof SuggestTicketTitleOutputSchema>;

export async function suggestTicketTitle(input: SuggestTicketTitleInput): Promise<SuggestTicketTitleOutput> {
  return suggestTicketTitleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTicketTitlePrompt',
  input: { schema: SuggestTicketTitleInputSchema },
  output: { schema: SuggestTicketTitleOutputSchema },
  prompt: `You are an AI assistant for a school maintenance system. Your task is to read a detailed problem description and create a short, standardized title for the maintenance ticket.

The title should be concise and clear, summarizing the core issue.

**Problem Description:**
"{{{description}}}"

**Instructions:**
1.  Read the description carefully.
2.  Identify the main subject (e.g., "Aire acondicionado", "Proyector", "Puerta de baño", "Toma eléctrica").
3.  Identify the core problem (e.g., "no funciona", "hace ruido", "está roto", "fuga de agua").
4.  Combine them into a standardized title. Use title case.

**Examples:**
-   Description: "El proyector del salón 203 no prende, ya revisé los cables pero no da imagen." -> Title: "Falla en Proyector de Salón 203"
-   Description: "la puerta del baño de niños del primer piso no cierra bien, el pestillo está trabado" -> Title: "Reparación de Puerta en Baño"
-   Description: "en mi puesto de trabajo, el enchufe de la pared está suelto y saca chispas a veces" -> Title: "Toma Eléctrica Defectuosa"
-   Description: "Necesito que por favor me ayuden a mover unas cajas pesadas de la bodega al laboratorio de química." -> Title: "Solicitud de Apoyo Logístico"

Generate only the title based on the description provided.
`,
});

const suggestTicketTitleFlow = ai.defineFlow(
  {
    name: 'suggestTicketTitleFlow',
    inputSchema: SuggestTicketTitleInputSchema,
    outputSchema: SuggestTicketTitleOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
