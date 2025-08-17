'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  suggestTechnicianAssignment,
  type SuggestTechnicianAssignmentInput,
  type SuggestTechnicianAssignmentOutput,
} from '@/ai/flows/suggest-technician-assignment';
import type { Ticket } from '@/lib/types';

export default function AiSuggestion({ ticket }: { ticket: Ticket }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestTechnicianAssignmentOutput | null>(null);
  const { toast } = useToast();

  const handleSuggestion = async () => {
    setIsLoading(true);
    setSuggestion(null);

    const input: SuggestTechnicianAssignmentInput = {
      ticketDescription: ticket.description,
      // Mock data for demonstration
      activeTickets: 3, 
      scheduledShifts: 2,
      cleaningTasks: 5,
    };

    try {
      const result = await suggestTechnicianAssignment(input);
      setSuggestion(result);
    } catch (error) {
      console.error('Error getting AI suggestion:', error);
      toast({
        variant: 'destructive',
        title: 'Error de IA',
        description: 'No se pudo obtener la sugerencia del asistente de IA.',
      });
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSuggestion}>
          <Sparkles className="mr-2 h-4 w-4" />
          Sugerir Técnico con IA
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <Sparkles className="text-primary" />
            Sugerencia de Asignación
          </DialogTitle>
          <DialogDescription>
            El asistente de IA ha analizado la carga de trabajo y recomienda al siguiente técnico.
          </DialogDescription>
        </DialogHeader>
        {isLoading && (
          <div className="space-y-4 py-4">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}
        {suggestion && (
          <div className="space-y-4 py-4">
            <h3 className="text-lg font-semibold text-primary">{suggestion.technicianId || 'Técnico Sugerido'}</h3>
            <p><strong>Carga de trabajo estimada:</strong> {suggestion.workloadPercentage}%</p>
            <div>
              <p className="font-semibold">Razón:</p>
              <p className="text-muted-foreground italic">"{suggestion.reason}"</p>
            </div>
            <Button className="w-full">Asignar a {suggestion.technicianId || 'este técnico'}</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
