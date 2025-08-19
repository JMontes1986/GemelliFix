

'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Users, X } from 'lucide-react';
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
import type { Ticket, User } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface AiSuggestionProps {
    ticket: Ticket;
    technicians: User[];
    onAssign: (technician: User[]) => void;
    isAssigned: boolean;
}

export default function AiSuggestion({ ticket, technicians, onAssign, isAssigned }: AiSuggestionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestTechnicianAssignmentOutput | null>(null);
  const [selectedPersonnelIds, setSelectedPersonnelIds] = useState<string[]>([]);
  const { toast } = useToast();
  
  useEffect(() => {
    if (ticket?.assignedToIds) {
        setSelectedPersonnelIds(ticket.assignedToIds);
    }
  }, [ticket, isOpen]);


  const handleOpenDialog = async () => {
    setIsOpen(true);
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
      // Pre-select the suggested technician if not already in the list
      if (result && !selectedPersonnelIds.includes(result.technicianId)) {
        setSelectedPersonnelIds(prev => [...prev, result.technicianId]);
      }
    } catch (error) {
      console.error('Error getting AI suggestion:', error);
      toast({
        variant: 'destructive',
        title: 'Error de IA',
        description: 'No se pudo obtener la sugerencia del asistente de IA.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleApplyAssignment = () => {
    const selectedPersonnel = technicians.filter(t => selectedPersonnelIds.includes(t.id));
    if (selectedPersonnel.length > 0) {
        onAssign(selectedPersonnel);
        setIsOpen(false);
    } else {
        onAssign([]); // Handle un-assigning all
        setIsOpen(false);
    }
  }

  const buttonText = isAssigned ? "Cambiar Asignación" : "Asignar Personal con IA";


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleOpenDialog}>
          <Sparkles className="mr-2 h-4 w-4" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <Sparkles className="text-primary" />
            Asistente de Asignación
          </DialogTitle>
          <DialogDescription>
            La IA recomienda al personal más idóneo. Puedes ajustar la selección manualmente.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading && (
          <div className="space-y-4 py-4">
            <h3 className="font-semibold text-primary">Sugerencia de la IA</h3>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}
        {suggestion && (
          <div className="space-y-2 py-2 bg-muted/50 p-4 rounded-lg">
            <h3 className="font-semibold text-primary">Sugerencia de la IA</h3>
            <div className="flex items-center gap-3">
               <Avatar className="h-10 w-10">
                    <AvatarImage src={technicians.find(t=>t.id === suggestion.technicianId)?.avatar} />
                    <AvatarFallback>{suggestion.technicianName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{suggestion.technicianName}</p>
                  <p className="text-xs text-muted-foreground">Carga de trabajo: {suggestion.workloadPercentage}%</p>
                </div>
            </div>
            <p className="text-sm text-muted-foreground pt-1 italic">"{suggestion.reason}"</p>
          </div>
        )}

        <Separator className="my-4" />

        <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Seleccionar Personal
            </h3>
             <div className="grid gap-2 max-h-48 overflow-y-auto pr-2">
                {technicians.map(tech => (
                    <div key={tech.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50">
                        <Checkbox 
                            id={`tech-select-${tech.id}`}
                            checked={selectedPersonnelIds.includes(tech.id)}
                            onCheckedChange={(checked) => {
                                setSelectedPersonnelIds(prev => 
                                    checked 
                                        ? [...prev, tech.id]
                                        : prev.filter(id => id !== tech.id)
                                );
                            }}
                        />
                        <Label htmlFor={`tech-select-${tech.id}`} className="flex items-center gap-2 font-normal w-full cursor-pointer">
                             <Avatar className="h-9 w-9">
                                <AvatarImage src={tech.avatar} />
                                <AvatarFallback>{tech.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            {tech.name}
                        </Label>
                    </div>
                ))}
            </div>
        </div>

        <Button className="w-full mt-4" onClick={handleApplyAssignment}>
            Aplicar Asignación ({selectedPersonnelIds.length})
        </Button>
      </DialogContent>
    </Dialog>
  );
}
