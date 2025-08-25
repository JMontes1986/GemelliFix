
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
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User, Ticket } from '@/lib/types';

// Define input schema
const SuggestCalendarAssignmentInputSchema = z.object({
  ticket: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    category: z.string(),
    priority: z.enum(['Baja', 'Media', 'Alta', 'Urgente']),
    createdAt: z.string().describe("The ticket's creation date in ISO 8601 format."),
  }).describe('The ticket or task that needs to be scheduled.'),
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
    reason: z.string().describe("A clear and concise explanation for the suggestion, explaining why the chosen technician and time are optimal. Mention any SLA risks if applicable."),
});
export type SuggestCalendarAssignmentOutput = z.infer<typeof SuggestCalendarAssignmentOutputSchema>;

// Define the tool to get technician data
const techniciansTool = ai.defineTool(
    {
        name: 'getTechnicianData',
        description: 'Returns the list of available technicians (role: "Servicios Generales"), their skills, current weekly workload, and their existing calendar events for a given date range.',
        inputSchema: z.object({
            startDate: z.string().describe("The start of the date range to check for events, in ISO format."),
            endDate: z.string().describe("The end of the date range to check for events, in ISO format."),
        }),
        outputSchema: z.array(z.object({
            id: z.string(),
            name: z.string(),
            skills: z.array(z.string()),
            workload: z.number().describe('The current workload percentage for the week.'),
            events: z.array(z.object({
                start: z.string().describe("Event start time in ISO format."),
                end: z.string().describe("Event end time in ISO format."),
            })).describe("The technician's scheduled events for the specified range."),
        })),
    },
    async ({startDate, endDate}) => {
        // 1. Get all technicians with role "Servicios Generales"
        const techQuery = query(collection(db, 'users'), where('role', '==', 'Servicios Generales'));
        const techSnapshot = await getDocs(techQuery);
        const technicians = techSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));

        // 2. For each technician, get their events in the date range
        const technicianData = await Promise.all(technicians.map(async (tech) => {
            const eventsQuery = query(
                collection(db, 'scheduleEvents'),
                where('technicianId', '==', tech.id),
                where('start', '>=', new Date(startDate)),
                where('start', '<=', new Date(endDate))
            );
            const eventsSnapshot = await getDocs(eventsQuery);
            const events = eventsSnapshot.docs.map(doc => {
                const data = doc.data();
                 // Handle both Firebase Timestamp and regular Date objects
                const start = data.start?.toDate ? data.start.toDate() : new Date(data.start);
                const end = data.end?.toDate ? data.end.toDate() : new Date(data.end);
                return {
                    start: start.toISOString(),
                    end: end.toISOString(),
                };
            });

            return {
                id: tech.id,
                name: tech.name,
                skills: ['General', 'Electricidad', 'Fontanería', 'Sistemas'], // Placeholder skills
                workload: Math.floor(Math.random() * 80) + 10, // Placeholder workload
                events,
            };
        }));
        
        return technicianData;
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
  prompt: `
Rol: Eres el Asistente de Programación de GemelliFix. Tu responsabilidad es proponer y/o confirmar la mejor franja horaria y el técnico adecuado para tareas y actividades del personal de Servicios Generales, maximizando cumplimiento de SLA, evitando choques y equilibrando la carga.
Idioma de salida: Español (Colombia).
Zona horaria: America/Bogota.
Ventana operativa estándar: 08:00–20:00 (extender solo si lo solicita el Líder o si la prioridad lo exige).
Fecha y hora actuales: ${new Date().toISOString()}

Objetivos (en orden)
1. Cumplir SLA por prioridad: Urgente 12h, Alta 24h, Media 36h, Baja 48h (desde ticket.createdAt).
2. Evitar choques de agenda (no superponer eventos del mismo técnico).
3. Balancear carga entre técnicos disponibles (distribuir horas totales en la semana).
4. Respetar restricciones: zonas, habilidades/categoría, disponibilidad, duración mínima realista.
5. Ofrecer explicación breve y accionable (por qué esa propuesta, alternativas si aplica).

Reglas de negocio y criterios
- Tipos: shift (turno), task (tarea), ticket (derivada de solicitud).
- Duración sugerida por defecto para un ticket: 120 min. Ajusta por categoría si es lógico (p.ej., Electricidad 90–180, Aseo puntual 60–120).
- SLA: Si la hora propuesta (targetDate) excede el SLA, recomienda una alternativa que cumpla; si es imposible, explica la razón, ofrece la mejor hora disponible y márcalo como “riesgo SLA”.
- Conflictos: No programes si el técnico ya tiene un evento solapado. En su lugar, busca la franja libre más cercana o sugiere otro técnico con menos carga y habilidades compatibles.
- No inventes datos. Si falta información, propón la mejor suposición razonable y decláralo.

**Petición del Usuario:**
- Ticket a asignar: "{{ticket.title}}" (Categoría: {{ticket.category}}, Prioridad: {{ticket.priority}}, Creado: {{ticket.createdAt}})
- Técnico deseado: ID {{targetTechnicianId}}
- Hora deseada: {{targetDate}}

**Tu Tarea (paso a paso):**
1. Calcula la fecha límite del SLA para este ticket.
   - Urgente: createdAt + 12 horas
   - Alta: createdAt + 24 horas
   - Media: createdAt + 36 horas
   - Baja: createdAt + 48 horas
2. Estima la duración de la tarea. Por defecto, 120 minutos.
3. Usa la herramienta \`getTechnicianData\` para obtener la lista completa de técnicos, su carga y sus eventos para la semana de la fecha objetivo (targetDate).
4. Analiza la propuesta del usuario:
   a. ¿La \`targetDate\` cumple con el SLA?
   b. ¿El técnico \`targetTechnicianId\` está libre en esa franja horaria (targetDate a targetDate + duración)?
   c. ¿El técnico tiene las habilidades para la categoría "{{ticket.category}}"? (Asume que todos pueden por ahora, pero prioriza si hubiera datos de habilidades).
5. Encuentra la mejor opción:
   a. Filtra los técnicos que no tengan conflictos de horario en la \`targetDate\`.
   b. De los disponibles, ordena por menor carga de trabajo (\`workload\`). El de menor carga es el candidato ideal.
6. Formula tu respuesta:
   a. **Si la elección del usuario (targetTechnicianId) es la ideal (o casi ideal) y cumple SLA y no tiene conflictos:** Confirma su elección. Razón: "Carlos es una excelente opción, tiene la disponibilidad y capacidad para esta tarea. La hora sugerida cumple con el SLA."
   b. **Si la elección del usuario tiene un conflicto de horario O excede el SLA:** Rechaza su propuesta amablemente. Busca el próximo espacio libre para ESE MISMO técnico que cumpla el SLA y sugiérelo. Razón: "Carlos ya tiene una tarea programada a esa hora. Te sugiero asignársela a las 14:00, que es su próximo espacio libre y aún cumple con el SLA."
   c. **Si hay un técnico MUCHO MEJOR (carga significativamente menor) O el técnico del usuario no está disponible pronto:** Sugiere el técnico alternativo. Razón: "Aunque Carlos es una buena opción, está bastante ocupado. Sugiero asignar esta tarea a Pedro, quien tiene una carga de trabajo menor (30%) y está disponible a la misma hora."
   d. **Si la \`targetDate\` está fuera del SLA:** Alerta sobre el riesgo. Razón: "¡Atención! La hora propuesta excede el tiempo de respuesta para un ticket de prioridad {{ticket.priority}}. Para cumplir el SLA, sugiero asignarlo a [Técnico Ideal] a más tardar a las [Hora Límite SLA]."

Finalmente, completa el objeto de salida con tu recomendación final.
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
            description: input.ticket.description || 'Tarea manual sin descripción detallada.',
        }
    };
    
    return finalSuggestion;
  }
);

    