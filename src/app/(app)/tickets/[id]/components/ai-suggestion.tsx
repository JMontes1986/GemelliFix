
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
import type { Ticket, Technician } from '@/lib/types';
import { technicians } from '@/lib/data';

interface AiSuggestionProps {
    ticket: Ticket;
    onAssign: (technician: Technician) => void;
}

export default function AiSuggestion({ ticket, onAssign }: AiSuggestionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestTechnicianAssignmentOutput | null>(null);
  const { toast } = useToast();

  const handleSuggestion = async () => {
    if (!isOpen) {
        setIsOpen(true);
    }
    
    setIsLoading(true);
    setSuggestion(null);

    const input: SuggestTechnicianAssignmentInput = {
      ticketTitle: ticket.title,
      ticketDescription: ticket.description,
      ticketCategory: ticket.category,
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
  
  const handleAssignFromSuggestion = () => {
    if (suggestion) {
        const suggestedTech = technicians.find(t => t.id === suggestion.technicianId);
        if (suggestedTech) {
            onAssign(suggestedTech);
            setIsOpen(false);
        } else {
             toast({
                variant: 'destructive',
                title: 'Error al Asignar',
                description: 'No se pudo encontrar al técnico sugerido.',
            });
        }
    }
  }


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
            El asistente de IA ha analizado la carga de trabajo y las habilidades, y recomienda al siguiente técnico.
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
            <h3 className="text-lg font-semibold text-primary">{suggestion.technicianName || 'Técnico Sugerido'}</h3>
            <p><strong>Carga de trabajo estimada:</strong> {suggestion.workloadPercentage}%</p>
            <div>
              <p className="font-semibold">Razón:</p>
              <p className="text-muted-foreground italic">"{suggestion.reason}"</p>
            </div>
            <Button className="w-full" onClick={handleAssignFromSuggestion}>Asignar a {suggestion.technicianName || 'este técnico'}</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
