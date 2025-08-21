
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Send, User, Bot, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { askAiAssistant } from '@/ai/flows/ask-ai-assistant';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AiAssistant() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy tu asistente de ayuda. ¿En qué puedo colaborarte hoy? Puedes preguntarme cómo crear un ticket, quiénes pueden aprobar solicitudes y más.'
    }
  ]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({
            top: scrollAreaRef.current.scrollHeight,
            behavior: 'smooth',
        });
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await askAiAssistant({ question: input });
      const assistantMessage: Message = { role: 'assistant', content: result.answer };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error asking AI assistant:', error);
      toast({
        variant: 'destructive',
        title: 'Error del Asistente',
        description: 'No se pudo obtener una respuesta. Por favor, inténtalo de nuevo.',
      });
       const errorMessage: Message = { role: 'assistant', content: 'Lo siento, he tenido un problema al procesar tu solicitud.' };
       setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="sr-only">Asistente de Ayuda IA</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-headline flex items-center gap-2">
            <Sparkles />
            Asistente de Ayuda GemelliFix
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 pr-4 -mr-4 my-4" ref={scrollAreaRef}>
            <div className="space-y-4">
                {messages.map((message, index) => (
                    <div
                    key={index}
                    className={cn(
                        'flex items-start gap-3',
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                    >
                    {message.role === 'assistant' && (
                        <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                         <AvatarFallback><Bot className="h-5 w-5" /></AvatarFallback>
                        </Avatar>
                    )}
                    <div
                        className={cn(
                        'max-w-xs rounded-lg px-4 py-2 text-sm prose prose-sm',
                        message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                    >
                         <ReactMarkdown
                            components={{
                                p: ({node, ...props}) => <p className="my-2" {...props} />,
                                ul: ({node, ...props}) => <ul className="my-2 pl-4 list-disc" {...props} />,
                                li: ({node, ...props}) => <li className="my-1" {...props} />,
                            }}
                         >
                            {message.content}
                        </ReactMarkdown>
                    </div>
                     {message.role === 'user' && (
                        <Avatar className="h-8 w-8 bg-muted text-muted-foreground">
                         <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
                        </Avatar>
                    )}
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-start gap-3 justify-start">
                        <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                            <AvatarFallback><Bot className="h-5 w-5" /></AvatarFallback>
                        </Avatar>
                        <div className="max-w-xs rounded-lg px-4 py-2 text-sm bg-muted flex items-center">
                            <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                    </div>
                )}
            </div>
        </ScrollArea>
        <SheetFooter>
          <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="¿Cómo creo un ticket?"
              className="flex-1 min-h-[40px] max-h-24"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
              <span className="sr-only">Enviar</span>
            </Button>
          </form>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
