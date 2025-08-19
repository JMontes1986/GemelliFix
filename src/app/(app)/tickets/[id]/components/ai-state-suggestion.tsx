
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
  suggestTicketStateChange,
  type SuggestTicketStateChangeInput,
  type SuggestTicketStateChangeOutput,
} from '@/ai/flows/suggest-ticket-state-change';
import type { Ticket } from '@/lib/types';
import { users } from '@/lib/data';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface AiStateSuggestionProps {
    ticket: Ticket;
    onStatusChange: (newStatus: string) => void;
}

const currentUser = users[0]; // Assuming admin user

export default function AiStateSuggestion({ ticket, onStatusChange }: AiStateSuggestionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestTicketStateChangeOutput | null>(null);
  const { toast } = useToast();

  const handleSuggestion = async () => {
    if (!isOpen) {
        setIsOpen(true);
    }
    
    setIsLoading(true);
    setSuggestion(null);

    const input: SuggestTicketStateChangeInput = {
      ticket: {
        id: ticket.id,
        status: ticket.status,
        dueDate: ticket.dueDate,
        assignedTo: ticket.assignedTo
      },
      currentUserRole: currentUser.role
    };

    try {
      const result = await suggestTicketStateChange(input);
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
  
  const handleActionFromSuggestion = () => {
    if (suggestion && suggestion.isActionable) {
        const recommendedStatus = suggestion.recommendation.match(/'([^']+)'/);
        if(recommendedStatus && recommendedStatus[1]) {
            onStatusChange(recommendedStatus[1]);
            setIsOpen(false);
        }
    }
  }


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSuggestion}>
          <Sparkles className="h-4 w-4 text-primary" />
           <span className="sr-only">Asistente de IA de Estado</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <Sparkles className="text-primary" />
            Asistente de Estado de Ticket
          </DialogTitle>
          <DialogDescription>
            La IA ha analizado el ticket y recomienda los siguientes pasos.
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
            <Alert variant={suggestion.analysis.includes("vencido") ? "destructive" : "default"}>
              <AlertTitle className="font-semibold">Análisis de la IA</AlertTitle>
              <AlertDescription>{suggestion.analysis}</AlertDescription>
            </Alert>
             <div>
                <p className="font-semibold">Acción Recomendada:</p>
                <p className="text-muted-foreground">{suggestion.recommendation}</p>
            </div>
            {suggestion.isActionable && (
                 <Button className="w-full" onClick={handleActionFromSuggestion}>Aplicar Sugerencia</Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
