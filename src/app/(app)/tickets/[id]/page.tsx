

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, updateDoc, collection, addDoc, serverTimestamp, query, where, getDocs, getDoc, arrayUnion, orderBy, limit } from 'firebase/firestore';
import { db, auth, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  File,
  User,
  Clock,
  Calendar,
  Tag,
  MapPin,
  MessageSquare,
  Paperclip,
  CheckCircle,
  Edit,
  ArrowRight,
  Camera,
  ThumbsUp,
  ThumbsDown,
  Briefcase,
  Loader2,
  Users,
  Download,
  UploadCloud,
  X as XIcon,
  Send,
  LogIn,
  PenSquare,
  AlertCircle,
  Star,
  FileText,
  ClipboardList,
} from 'lucide-react';
import type { Ticket, User as CurrentUser, Attachment, Log, Category, Requisition } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { ClientFormattedDate } from '@/components/ui/client-formatted-date';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { onAuthStateChanged } from 'firebase/auth';
import { createLog } from '@/lib/utils';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import PdfViewer from '@/components/ui/pdf-viewer';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf", "video/mp4", "video/webm", "video/quicktime"];


const getPriorityBadgeVariant = (priority: Ticket['priority']) => {
  switch (priority) {
    case 'Urgente': return 'destructive';
    case 'Alta': return 'default';
    case 'Media': return 'secondary';
    case 'Baja': return 'outline';
    default: return 'default';
  }
};

const getPriorityBadgeClassName = (priority: Ticket['priority']) => {
    switch(priority) {
        case 'Alta': return 'bg-orange-500 text-white';
        case 'Media': return 'bg-yellow-400 text-black';
        default: return '';
    }
}

const getStatusBadgeVariant = (status: Ticket['status']) => {
  switch (status) {
    case 'Abierto': return 'destructive';
    case 'Asignado': return 'default';
    case 'En Progreso': return 'default';
    case 'Requiere Aprobación': return 'default';
    case 'Resuelto': return 'default';
    case 'Cerrado': return 'secondary';
    case 'Cancelado': return 'secondary';
    default: return 'default';
  }
};

const getStatusBadgeClassName = (status: Ticket['status']) => {
    switch (status) {
      case 'Asignado': return 'bg-blue-500 text-white';
      case 'Requiere Aprobación': return 'bg-purple-500 text-white';
      case 'En Progreso': return 'bg-yellow-500 text-black';
      case 'Resuelto': return 'bg-green-600 text-white';
      case 'Cancelado': return 'bg-gray-400 text-black';
      default: return '';
    }
}

const LogIcon = ({ action }: { action: Log['action'] }) => {
    switch (action) {
        case 'create_ticket': return <CheckCircle className="w-5 h-5 text-green-500" />;
        case 'update_status': return <PenSquare className="w-5 h-5 text-yellow-500" />;
        case 'close_with_task': return <ClipboardList className="w-5 h-5 text-green-500" />;
        case 'update_assignment': return <ArrowRight className="w-5 h-5 text-blue-500" />;
        case 'add_comment': return <MessageSquare className="w-5 h-5 text-gray-500" />;
        default: return <LogIn className="w-5 h-5 text-gray-400" />;
    }
};

// New function to render log descriptions
const renderLogDescription = (log: Log) => {
    const userName = <strong className="font-semibold">{log.userName}</strong>;
    const { action, details } = log;
    
    switch(action) {
        case 'create_ticket':
            return <>{userName} creó el ticket.</>;
        case 'update_status':
             if (details.requisitionId) {
                return <>{userName} actualizó el estado a <strong>'Requiere Aprobación'</strong> adjuntando la requisición <Link href={`/requisitions`} className="text-primary hover:underline">{details.requisitionId}</Link>.</>;
            }
            return <>{userName} actualizó el estado de '{details.oldValue}' a <strong>'{details.newValue}'</strong>.</>;
        case 'close_with_task':
            return <>{userName} cerró el ticket con una tarea pendiente.</>
        case 'update_priority':
            return <>{userName} actualizó la prioridad de '{details.oldValue}' a <strong>'{details.newValue}'</strong>.</>;
        case 'update_assignment':
            return <>{userName} cambió la asignación de '{details.oldValue || 'nadie'}' a <strong>'{details.newValue || 'nadie'}'</strong>.</>;
        case 'add_comment':
            return <>{userName} añadió un comentario.</>;
        case 'login':
             return <>{userName} inició sesión.</>;
        default:
            return <>Acción desconocida.</>;
    }
};

async function createNotification(ticket: Ticket, assignedPersonnelIds: string[]) {
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("id", "in", assignedPersonnelIds));
        const querySnapshot = await getDocs(q);

        const notificationPromises = querySnapshot.docs.map(userDoc => {
            const userData = userDoc.data();
            const newNotification = {
                userId: userData.id,
                title: 'Nuevo Ticket Asignado',
                description: `Se te ha asignado el ticket: "${ticket.title}" (${ticket.code})`,
                createdAt: serverTimestamp(),
                read: false,
                type: 'ticket' as const,
                linkTo: `/tickets/${ticket.id}`,
            };
            return addDoc(collection(db, "notifications"), newNotification);
        });

        await Promise.all(notificationPromises);
    } catch (error) {
        console.error("Error creating notifications:", error);
    }
}

const isStateChangeAllowed = (currentStatus: Ticket['status'], nextStatus: Ticket['status'], userRole: CurrentUser['role']): boolean => {
    if (userRole === 'Administrador') {
        return true; // Admins can change to any state
    }
    
    // For general services, enforce state progression
    if (userRole === 'Servicios Generales') {
        const statusOrder: Ticket['status'][] = ['Abierto', 'Asignado', 'En Progreso', 'Requiere Aprobación', 'Resuelto', 'Cerrado'];
        
        // Cancelled is a final state, cannot be changed from it unless you are admin
        if (currentStatus === 'Cancelado' || currentStatus === 'Cerrado') return false;

        const currentIndex = statusOrder.indexOf(currentStatus);
        const nextIndex = statusOrder.indexOf(nextStatus);
        
        // Can't go backwards. Can go from Asignado to En Progreso, etc.
        return nextIndex >= currentIndex;
    }
    
    return false; // Default to deny
};

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter(); // NUEVO
  const ticketId = params.id as string;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [technicians, setTechnicians] = useState<CurrentUser[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [comment, setComment] = useState("");
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [logError, setLogError] = useState<string | null>(null);

  // State for Admin "Requires Approval" dialog
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalObservation, setApprovalObservation] = useState('');
  const [approvalFiles, setApprovalFiles] = useState<File[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [selectedRequisitionId, setSelectedRequisitionId] = useState<string>('');

  // State for Admin "Close Ticket" dialog
  const [isCloseTicketDialogOpen, setIsCloseTicketDialogOpen] = useState(false);
  const [closingObservation, setClosingObservation] = useState('');


  // State for manual assignment dialog
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedPersonnelIds, setSelectedPersonnelIds] = useState<string[]>([]);
  
  // State for satisfaction survey
  const [satisfactionRating, setSatisfactionRating] = useState<number>(0);
  const [satisfactionComment, setSatisfactionComment] = useState("");


  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const userData = { id: userDocSnap.id, ...userDocSnap.data() } as CurrentUser;
                setCurrentUser(userData);

                // Fetch technicians only if the user is an admin
                if (userData.role === 'Administrador') {
                    const q_technicians = query(collection(db, 'users'), where('role', '==', 'Servicios Generales'));
                    const unsubscribe_technicians = onSnapshot(q_technicians, (querySnapshot) => {
                        const fetchedTechnicians: CurrentUser[] = [];
                        querySnapshot.forEach((doc) => {
                            fetchedTechnicians.push({ id: doc.id, ...doc.data() } as CurrentUser);
                        });
                        setTechnicians(fetchedTechnicians);
                    }, (error) => {
                        console.error("Error fetching technicians:", error);
                        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el personal de Servicios Generales.' });
                    });

                    // Fetch all categories for the admin dropdown
                    const qCategories = query(collection(db, 'categories'), orderBy('name'));
                    const unsubscribeCategories = onSnapshot(qCategories, (snapshot) => {
                        const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
                        setCategories(cats);
                    });

                    const qRequisitions = query(collection(db, 'requisitions'), orderBy('createdAt', 'desc'));
                    const unsubscribeRequisitions = onSnapshot(qRequisitions, (snapshot) => {
                        const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Requisition));
                        setRequisitions(reqs);
                    });
                    
                    return () => {
                        unsubscribe_technicians();
                        unsubscribeCategories();
                        unsubscribeRequisitions();
                    };
                }
            }
        }
    });

    return () => unsubscribeAuth();
  }, [toast]);


  useEffect(() => {
    if (!ticketId) {
        setError("No se proporcionó un ID de ticket.");
        setIsLoading(false);
        return;
    }

    const docRef = doc(db, "tickets", ticketId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString();
            const dueDate = data.dueDate?.toDate ? data.dueDate.toDate().toISOString() : new Date().toISOString();
            const resolvedAt = data.resolvedAt?.toDate ? data.resolvedAt.toDate().toISOString() : undefined;
            
            const ticketData: Ticket = {
                id: docSnap.id,
                code: data.code,
                title: data.title,
                description: data.description,
                zone: data.zone,
                site: data.site,
                category: data.category,
                priority: data.priority,
                status: data.status,
                createdAt,
                dueDate,
                resolvedAt,
                assignedTo: data.assignedTo || [],
                requester: data.requester,
                requesterId: data.requesterId,
                assignedToIds: data.assignedToIds || [],
                attachments: data.attachments || [],
                evidence: data.evidence || [],
                statusHistory: data.statusHistory || {},
                satisfactionRating: data.satisfactionRating,
                satisfactionComment: data.satisfactionComment,
                satisfactionSurveyCompleted: data.satisfactionSurveyCompleted,
                pendingTask: data.pendingTask,
            };
            setTicket(ticketData);
            setSelectedPersonnelIds(ticketData.assignedToIds || []);
        } else {
            setError("No se pudo encontrar el ticket especificado.");
        }
        setIsLoading(false);
    }, (err) => {
        console.error("Error fetching ticket:", err);
        // Manejo específico de permisos
        if (err?.code === 'permission-denied') {
          setError("No tienes permisos para ver este ticket. Serás redirigido a tu bandeja de solicitudes.");
          // redirección suave para evitar quedarse “bloqueado” en una vista no permitida
          setTimeout(() => router.push('/tickets'), 1200);
        } else {
          setError("Error al cargar el ticket. Verifica tu conexión y permisos.");
        }
        setIsLoading(false);
    });
    
    // Fetch logs for the ticket
    setIsLoadingLogs(true);
    setLogError(null);
    const logsQuery = query(
      collection(db, 'logs'), 
      where('details.ticketId', '==', ticketId),
      orderBy('timestamp', 'asc'),
      limit(50) // Good practice: limit the number of logs fetched
    );
    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
        const fetchedLogs: Log[] = [];
        snapshot.forEach(doc => {
            fetchedLogs.push({ id: doc.id, ...doc.data()} as Log);
        });
        setLogs(fetchedLogs.reverse()); // Reverse on the client to show newest first
        setIsLoadingLogs(false);
    }, (err) => {
        console.error("Error fetching logs: ", err);
        if (err.code === 'failed-precondition') {
            setLogError('La consulta del historial necesita un índice de base de datos que no existe. Por favor, crea el índice en la consola de Firebase como sugiere el mensaje de error de la consola y vuelve a cargar la página.');
        } else if (err.code === 'permission-denied') {
            setLogError('No tienes permisos suficientes para ver el historial de este ticket.');
        } else {
            setLogError('Ocurrió un error al cargar el historial.');
        }
        setIsLoadingLogs(false);
    });

    return () => {
        unsubscribe();
        unsubscribeLogs();
    };
}, [ticketId, router]);


  const canEdit = currentUser?.role === 'Administrador';
  const isSST = currentUser?.role === 'SST';
  const isRequester = currentUser?.id === ticket?.requesterId;
  const isAssignedToCurrentUser = ticket?.assignedToIds?.includes(currentUser?.id ?? '') ?? false;
  const shouldShowSurvey = ticket?.status === 'Cerrado' && (
      (isRequester && currentUser?.role !== 'Administrador') || 
      (canEdit) 
  );

  const handleStatusChange = (newStatus: Ticket['status']) => {
    if (!canEdit) return;

    if (newStatus === 'Requiere Aprobación') {
        setIsApprovalDialogOpen(true);
    } else if (newStatus === 'Cerrado') {
        setIsCloseTicketDialogOpen(true);
    } else {
        handleUpdate('status', newStatus);
    }
  };
  
  const handleAdminRequiresApproval = async () => {
    if (!ticket || !currentUser || !canEdit) return;
    
    setIsUpdating(true);
    try {
        let uploadedAttachments: Attachment[] = [];
        if (approvalFiles.length > 0) {
            toast({ title: 'Subiendo archivos...', description: 'Por favor, espera un momento.' });
            const uploadPromises = approvalFiles.map(async (file) => {
                const storageRef = ref(storage, `ticket-attachments/${ticket.id}/${Date.now()}-${file.name}`);
                const snapshot = await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(snapshot.ref);
                return { url: downloadURL, description: file.name };
            });
            uploadedAttachments = await Promise.all(uploadPromises);
        }

        const docRef = doc(db, "tickets", ticket.id);
        await updateDoc(docRef, {
            status: 'Requiere Aprobación',
            'statusHistory.Requiere Aprobación': new Date().toISOString(),
            attachments: arrayUnion(...uploadedAttachments)
        });
        
        await createLog(currentUser, 'update_status', { 
            ticket, 
            oldValue: ticket.status, 
            newValue: 'Requiere Aprobación', 
            comment: approvalObservation, 
            requisitionId: selectedRequisitionId 
        });
        
        // Reset and close
        setApprovalObservation('');
        setApprovalFiles([]);
        setSelectedRequisitionId('');
        setIsApprovalDialogOpen(false);
        
        toast({ title: 'Ticket enviado a aprobación', description: 'La observación y los archivos han sido añadidos.' });
    } catch (uploadError: any) {
        console.error("Error in admin requires approval flow:", uploadError);
        toast({ variant: "destructive", title: "Error", description: `No se pudo completar la acción. ${uploadError.message}` });
    } finally {
        setIsUpdating(false);
    }
  };


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileSetter: React.Dispatch<React.SetStateAction<File[]>>) => {
    if (e.target.files) {
        const newFiles = Array.from(e.target.files);
        const validFiles: File[] = [];

        for (const file of newFiles) {
            if (file.size > MAX_FILE_SIZE) {
                toast({ variant: 'destructive', title: 'Archivo demasiado grande', description: `El archivo ${file.name} supera los 10MB.` });
                continue;
            }
            if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
                toast({ variant: 'destructive', title: 'Tipo de archivo no permitido', description: `El archivo ${file.name} no es una imagen, video o PDF.` });
                continue;
            }
            validFiles.push(file);
        }
        fileSetter(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (indexToRemove: number, fileSetter: React.Dispatch<React.SetStateAction<File[]>>) => {
      fileSetter(prev => prev.filter((_, index) => index !== indexToRemove));
  };


  const handleUpdate = async (field: keyof Ticket | 'multiple', value: any, commentText?: string) => {
    if (!ticket || !currentUser) return;
    if (isSST) {
      toast({ variant: 'destructive', title: 'Acción no permitida', description: 'El rol SST no puede modificar tickets.'});
      return;
    }

    if (field === 'status') {
      if (!isStateChangeAllowed(ticket.status, value, currentUser.role)) {
          toast({
              variant: "destructive",
              title: "Cambio de Estado no Permitido",
              description: "No puedes mover un ticket a un estado anterior.",
          });
          return;
      }
      // This check should only apply to technicians updating progress
      if (currentUser.role === 'Servicios Generales' && ticket.status !== 'Asignado' && value !== 'Asignado' && !(commentText || comment).trim()) {
        toast({
            variant: "destructive",
            title: "Comentario Requerido",
            description: "Debes agregar un comentario de progreso para cambiar el estado.",
        });
        return;
      }
    }

    setIsUpdating(true);
    const docRef = doc(db, "tickets", ticket.id);
    const oldValue = field !== 'multiple' ? ticket[field] : null;
    
    let updates: { [key: string]: any } = {};
    let logDetails: any;

    if (field === 'multiple') {
        updates = value; // value is an object with multiple updates
        logDetails = { ticket, oldValue: ticket.status, newValue: updates.status, comment: commentText || comment };
    } else {
        updates = { [field]: value };
        logDetails = { ticket, oldValue, newValue: value, comment: commentText || comment };
    }

    // Add status history tracking
    if (field === 'status' || (field === 'multiple' && updates.status)) {
        const newStatus = field === 'status' ? value : updates.status;
        const statusKey = `statusHistory.${newStatus}`;
        updates[statusKey] = new Date().toISOString();
        if (['Cerrado', 'Resuelto'].includes(newStatus) && !ticket.resolvedAt) {
            updates.resolvedAt = new Date().toISOString();
        }
    }
    
    if (field === 'priority' || (field === 'multiple' && 'priority' in updates)) {
        const priority = field === 'multiple' ? updates.priority : value;
        const createdAt = new Date(ticket.createdAt);
        let newDueDate = new Date(createdAt);
        switch(priority) {
            case 'Urgente': newDueDate.setHours(createdAt.getHours() + 12); break;
            case 'Alta': newDueDate.setHours(createdAt.getHours() + 24); break;
            case 'Media': newDueDate.setHours(createdAt.getHours() + 36); break;
            case 'Baja': newDueDate.setHours(createdAt.getHours() + 48); break;
        }
        updates.dueDate = newDueDate;
        logDetails.newValue = `${priority} (vence: ${newDueDate.toLocaleDateString()})`;
    }
    
    try {
      await updateDoc(docRef, updates);

      if (field === 'status' || field === 'priority') {
        await createLog(currentUser, `update_${field}`, logDetails);
      } else if (field === 'multiple') {
        await createLog(currentUser, `update_status`, logDetails);
      }
      
      // If there was a comment during a status change, log it separately.
      if ( (commentText || comment).trim() && (field === 'status' || field === 'multiple')) {
         await createLog(currentUser, 'add_comment', { ticket, comment: commentText || comment });
      }

      setComment('');

      toast({
        title: "Ticket Actualizado",
        description: `La información del ticket ha sido actualizada.`,
      });
    } catch (error: any) {
      console.error("Error updating ticket: ", error);
      toast({
        variant: "destructive",
        title: "Error al Actualizar",
        description: `No se pudo actualizar el ticket. ${error.message}`,
      });
    } finally {
        setIsUpdating(false);
    }
  }

  const handleProgressUpdate = async () => {
    if (!ticket || !currentUser) return;
    if (isSST) {
      toast({ variant: 'destructive', title: 'Acción no permitida', description: 'El rol SST no puede modificar tickets.'});
      return;
    }

    if (filesToUpload.length === 0) {
        toast({
            variant: "destructive",
            title: "Evidencia Requerida",
            description: "Se requiere evidencia para enviar un ticket a aprobación.",
        });
        return;
    }
    if (!comment.trim()) {
        toast({
            variant: "destructive",
            title: "Comentario Requerido",
            description: "Debes agregar un comentario de progreso.",
        });
        return;
    }

    setIsUpdating(true);
    let uploadedEvidence: Attachment[] = [];

    try {
        toast({ title: 'Subiendo evidencia...', description: 'Por favor, espera un momento.' });
        const uploadPromises = filesToUpload.map(async (file) => {
            const storageRef = ref(storage, `ticket-evidence/${ticket.id}/${Date.now()}-${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            return { url: downloadURL, description: file.name };
        });
        uploadedEvidence = await Promise.all(uploadPromises);
        
        const docRef = doc(db, "tickets", ticket.id);
        await updateDoc(docRef, {
            status: 'Requiere Aprobación',
            evidence: arrayUnion(...uploadedEvidence),
            'statusHistory.Requiere Aprobación': new Date().toISOString()
        });
        
        await createLog(currentUser, 'update_status', { ticket, oldValue: ticket.status, newValue: 'Requiere Aprobación', comment });


        setFilesToUpload([]); // Limpiar archivos después de la subida exitosa
        setComment(''); // Limpiar comentario
        
        toast({
            title: 'Progreso Actualizado',
            description: 'El ticket ha sido enviado para su aprobación.'
        });

    } catch (uploadError: any) {
        console.error("Error uploading evidence:", uploadError);
        toast({
            variant: "destructive",
            title: "Error al Subir Evidencia",
            description: `No se pudieron subir los archivos. ${uploadError.message}`,
        });
    } finally {
        setIsUpdating(false);
    }
  };
  
   const handleAssignPersonnel = async () => {
    if(!ticket || !currentUser) return;
    if (isSST) {
      toast({ variant: 'destructive', title: 'Acción no permitida', description: 'El rol SST no puede modificar tickets.'});
      return;
    }

    const selectedTechnicians = technicians.filter(t => selectedPersonnelIds.includes(t.id));
    
    let personnelIds = selectedTechnicians.map(p => p.id);
    let personnelNames = selectedTechnicians.map(p => p.name);

    if (selectedPersonnelIds.includes('contractor')) {
        personnelIds.push('contractor');
        personnelNames.push('Contratista Externo');
    }
    
    const oldValue = ticket.assignedTo || [];
    
    setIsUpdating(true);
    const docRef = doc(db, "tickets", ticket.id);
    const newStatus = personnelIds.length > 0 ? 'Asignado' : 'Abierto';
    await updateDoc(docRef, {
        assignedToIds: personnelIds,
        assignedTo: personnelNames,
        status: newStatus,
        'statusHistory.Asignado': new Date().toISOString()
    });
    setIsUpdating(false);
    setIsAssignDialogOpen(false); // Close dialog on success

    await createLog(currentUser, 'update_assignment', { ticket, oldValue, newValue: personnelNames });
    
    const internalTechIds = selectedTechnicians.map(t => t.id);
    if (internalTechIds.length > 0) {
        await createNotification(ticket, internalTechIds);
    }

    toast({
        title: "Personal Asignado",
        description: `El ticket ha sido actualizado y se ha notificado al personal.`,
    });
  }

  const handleApproval = async (approve: boolean) => {
    if (!ticket || !currentUser || !canEdit) return;
    
    if (approve) {
        setIsCloseTicketDialogOpen(true);
    } else {
        await handleUpdate('status', 'Asignado', `Ticket rechazado por ${currentUser.name}.`);
        toast({
            title: `Ticket Rechazado`,
            description: 'La solicitud ha sido devuelta al personal asignado.'
        });
    }
  };

  const handleCloseTicket = async () => {
    if (!ticket || !currentUser || !canEdit) return;
    setIsUpdating(true);

    const updates: any = { 
        status: 'Cerrado',
        resolvedAt: new Date().toISOString(),
        'statusHistory.Cerrado': new Date().toISOString()
    };
    if (closingObservation.trim()) {
        updates.pendingTask = closingObservation.trim();
    }

    try {
        const docRef = doc(db, 'tickets', ticket.id);
        await updateDoc(docRef, updates);

        await createLog(
            currentUser, 
            closingObservation.trim() ? 'close_with_task' : 'update_status', 
            { ticket, oldValue: ticket.status, newValue: 'Cerrado', pendingTask: closingObservation.trim() }
        );
        
        toast({ title: 'Ticket Aprobado y Cerrado', description: 'La solicitud ha sido marcada como cerrada.' });
        setIsCloseTicketDialogOpen(false);
        setClosingObservation('');

    } catch (error) {
        console.error("Error closing ticket:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cerrar el ticket.' });
    } finally {
        setIsUpdating(false);
    }
  };

  const handleSatisfactionSubmit = async () => {
    if (!ticket || !currentUser) return;
    if (satisfactionRating === 0) {
        toast({ variant: 'destructive', title: 'Calificación requerida', description: 'Por favor, selecciona una calificación de 1 a 5.' });
        return;
    }
    
    setIsUpdating(true);
    try {
        const docRef = doc(db, 'tickets', ticket.id);
        await updateDoc(docRef, {
            satisfactionRating: satisfactionRating,
            satisfactionComment: satisfactionComment,
            satisfactionSurveyCompleted: true,
        });

        toast({ title: '¡Gracias por tus comentarios!', description: 'Tu opinión ha sido registrada.' });
    } catch (error: any) {
        console.error("Error submitting satisfaction survey:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar tu calificación.' });
    } finally {
        setIsUpdating(false);
    }
  };


  if (isLoading || !currentUser) {
    return (
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
            <Card>
                <CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-20 w-full" />
                </CardContent>
            </Card>
        </div>
        <div>
            <Card><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (error) {
    return <Card><CardHeader><CardTitle>Error</CardTitle></CardHeader><CardContent><p className="text-red-500">{error}</p></CardContent></Card>;
  }
  
  if (!ticket) {
     return <Card><CardHeader><CardTitle>Ticket no encontrado</CardTitle></CardHeader><CardContent><p>El ticket que buscas no existe o ha sido eliminado.</p></CardContent></Card>;
  }
  
  const assignedPersonnelDetails = technicians.filter(
    (tech) => ticket.assignedToIds?.includes(tech.id)
  );

  if (ticket.assignedTo?.includes('Contratista Externo') && !assignedPersonnelDetails.some(p => p.id === 'contractor')) {
      const contractorPlaceholder = {
          id: 'contractor',
          name: 'Contratista Externo',
          avatar: '', // no avatar
      };
      // A temporary fix to display contractor info. This is not a real user object.
      assignedPersonnelDetails.push(contractorPlaceholder as any);
  }
  

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardDescription>{ticket.code}</CardDescription>
                <CardTitle className="font-headline text-2xl mt-1">{ticket.title}</CardTitle>
              </div>
              {canEdit ? (
                <Select value={ticket.priority} onValueChange={(value) => handleUpdate('priority', value)} disabled={isUpdating}>
                    <SelectTrigger className="w-[180px] h-9 text-sm">
                        <SelectValue placeholder="Cambiar prioridad" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Baja">Baja</SelectItem>
                        <SelectItem value="Media">Media</SelectItem>
                        <SelectItem value="Alta">Alta</SelectItem>
                        <SelectItem value="Urgente">Urgente</SelectItem>
                    </SelectContent>
                </Select>
              ) : (
                <Badge variant={getPriorityBadgeVariant(ticket.priority)} className={`text-sm ${getPriorityBadgeClassName(ticket.priority)}`}>
                    {ticket.priority}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2 text-primary">Descripción</h3>
              <p className="text-muted-foreground">{ticket.description}</p>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <strong>Zona:</strong>
                    <span>{ticket.zone}</span>
                </div>
                 <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <strong>Sitio:</strong>
                    <span>{ticket.site}</span>
                </div>
                <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <strong>Solicitante:</strong>
                    <span>{ticket.requester}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    <strong>Estado:</strong>
                     <div className="flex items-center gap-1">
                        {(canEdit) ? (
                            <Select value={ticket.status} onValueChange={(value) => handleStatusChange(value as Ticket['status'])} disabled={isUpdating || isSST}>
                                <SelectTrigger className="w-[150px] h-8 text-xs">
                                    <SelectValue placeholder="Cambiar estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Abierto">Abierto</SelectItem>
                                    <SelectItem value="Asignado">Asignado</SelectItem>
                                    <SelectItem value="Requiere Aprobación">Requiere Aprobación</SelectItem>
                                    <SelectItem value="En Progreso">En Progreso</SelectItem>
                                    <SelectItem value="Resuelto">Resuelto</SelectItem>
                                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                                    <SelectItem value="Cerrado">Cerrado</SelectItem>
                                </SelectContent>
                            </Select>
                        ) : (
                             <Badge variant={getStatusBadgeVariant(ticket.status)} className={getStatusBadgeClassName(ticket.status)}>{ticket.status}</Badge>
                        )}
                    </div>
                   
                </div>
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <strong>Creado:</strong>
                    <span><ClientFormattedDate date={ticket.createdAt} /></span>
                </div>
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <strong>Vencimiento:</strong>
                    <span><ClientFormattedDate date={ticket.dueDate} /></span>
                </div>
                <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    <strong>Categoría:</strong>
                     {canEdit ? (
                        <Select value={ticket.category} onValueChange={(value) => handleUpdate('category', value)} disabled={isUpdating}>
                            <SelectTrigger className="w-[180px] h-8 text-xs">
                                <SelectValue placeholder="Cambiar categoría" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(cat => (
                                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <span>{ticket.category}</span>
                    )}
                </div>
            </div>
             {ticket.attachments && ticket.attachments.length > 0 && (
                <>
                    <Separator />
                    <div>
                        <h3 className="font-semibold mb-2 text-primary flex items-center gap-2"><Paperclip className="w-4 h-4" /> Adjuntos Iniciales</h3>
                        <div className="flex flex-wrap gap-2">
                            {ticket.attachments.map((file, index) => (
                                <a key={index} href={file.url} target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" size="sm"><File className="w-4 h-4 mr-2"/> {file.description}</Button>
                                </a>
                            ))}
                        </div>
                    </div>
                </>
             )}
            {ticket.pendingTask && (
                <>
                <Separator />
                <div>
                    <h3 className="font-semibold mb-2 text-primary flex items-center gap-2"><ClipboardList className="w-4 h-4"/> Tarea Pendiente</h3>
                    <blockquote className="border-l-2 pl-4 italic text-muted-foreground">
                        {ticket.pendingTask}
                    </blockquote>
                </div>
                </>
            )}
          </CardContent>
        </Card>

        {ticket.evidence && ticket.evidence.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-lg flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" /> Evidencia de Resolución</CardTitle>
            </CardHeader>
             <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ticket.evidence.map((att, index) => {
                    const isPdf = att.url.toLowerCase().includes('.pdf');
                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(att.url);
                    
                    return (
                        <Card key={index} className="overflow-hidden">
                            <CardContent className="p-0">
                                {isImage ? (
                                    <Image src={att.url} alt={att.description} width={400} height={300} className="w-full h-auto object-cover aspect-video" data-ai-hint="repair evidence"/>
                                ) : (
                                    <div className="aspect-video bg-muted flex flex-col items-center justify-center p-4">
                                        <File className={cn("w-12 h-12", isPdf ? "text-red-500" : "text-muted-foreground")}/>
                                        <p className="mt-2 text-center text-sm text-muted-foreground">{att.description}</p>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="p-2 bg-background/50">
                                {isPdf ? (
                                     <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="secondary" className="w-full">
                                                <File className="mr-2 h-4 w-4" />
                                                Ver PDF
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-4xl h-[90vh]">
                                           <PdfViewer fileUrl={att.url} fileName={att.description} />
                                        </DialogContent>
                                    </Dialog>
                                ) : (
                                    <a href={att.url} target="_blank" rel="noopener noreferrer" className="w-full">
                                        <Button variant="secondary" className="w-full">
                                            <Download className="mr-2 h-4 w-4" />
                                            Descargar/Ver
                                        </Button>
                                    </a>
                                )}
                            </CardFooter>
                        </Card>
                    )
                })}
            </CardContent>
            {canEdit && ticket.status === 'Requiere Aprobación' && (
              <CardFooter className="gap-4">
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApproval(true)} disabled={isUpdating}><ThumbsUp className="mr-2" /> Aprobar y Cerrar Ticket</Button>
                <Button variant="destructive" className="w-full" onClick={() => handleApproval(false)} disabled={isUpdating}><ThumbsDown className="mr-2" /> Rechazar Solución</Button>
              </CardFooter>
            )}
          </Card>
        )}

        {shouldShowSurvey && (
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-lg flex items-center gap-2"><Star className="w-5 h-5 text-yellow-500" /> Encuesta de Satisfacción del Servicio</CardTitle>
                </CardHeader>
                <CardContent>
                    {ticket.satisfactionSurveyCompleted ? (
                        <div className="text-center p-4 bg-muted rounded-lg">
                            <h4 className="font-semibold">¡Gracias por tu opinión!</h4>
                           {ticket.satisfactionRating ? (
                             <>
                                <p className="text-muted-foreground mt-2">Calificación registrada:</p>
                                <div className="flex justify-center gap-1 mt-2">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <Star key={star} className={cn("w-6 h-6", ticket.satisfactionRating && ticket.satisfactionRating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground')} />
                                    ))}
                                </div>
                                {ticket.satisfactionComment && <p className="text-sm italic mt-2">Comentario: "{ticket.satisfactionComment}"</p>}
                             </>
                           ) : (
                             <p className="text-muted-foreground mt-2">El usuario omitió la calificación.</p>
                           )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-muted-foreground">Por favor, califica de 1 a 5 estrellas la calidad del servicio recibido, donde 5 es excelente.</p>
                            <div className="flex justify-center gap-2">
                                {[1, 2, 3, 4, 5].map(rating => (
                                    <Button key={rating} variant={satisfactionRating === rating ? 'default' : 'outline'} size="icon" onClick={() => setSatisfactionRating(rating)} disabled={isUpdating || canEdit}>
                                        {rating}
                                    </Button>
                                ))}
                            </div>
                            <div>
                                <Label htmlFor="satisfaction-comment">Comentarios Adicionales (Opcional)</Label>
                                <Textarea 
                                    id="satisfaction-comment" 
                                    placeholder="Tu opinión nos ayuda a mejorar..." 
                                    value={satisfactionComment}
                                    onChange={(e) => setSatisfactionComment(e.target.value)}
                                    disabled={isUpdating || canEdit}
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
                {!ticket.satisfactionSurveyCompleted && !canEdit && (
                     <CardFooter>
                        <Button className="w-full" onClick={handleSatisfactionSubmit} disabled={isUpdating}>
                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {satisfactionRating === 0 ? 'Omitir y Enviar' : 'Enviar Calificación'}
                        </Button>
                    </CardFooter>
                )}
            </Card>
        )}

      </div>
      <div>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="font-headline text-lg flex items-center gap-2"><Users className="w-5 h-5" />Personal Asignado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {assignedPersonnelDetails.length > 0 ? (
                assignedPersonnelDetails.map(person => (
                    <div key={person.id} className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                        <AvatarImage src={person.avatar} />
                        <AvatarFallback>{person.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                        <h4 className="font-semibold">{person.name}</h4>
                        </div>
                    </div>
                ))
            ) : (
              <div className='text-sm text-muted-foreground'>Sin asignar</div>
            )}
          </CardContent>
          {canEdit && (
            <CardFooter>
                 <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="default" className="w-full">
                            <Users className="mr-2 h-4 w-4" />
                            {assignedPersonnelDetails.length > 0 ? "Cambiar Asignación" : "Asignar Personal"}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Asignar Personal</DialogTitle>
                            <DialogDescription>
                                Selecciona el personal de Servicios Generales para este ticket.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid gap-2 max-h-60 overflow-y-auto pr-2">
                                <div className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50">
                                    <Checkbox 
                                        id='tech-assign-contractor'
                                        checked={selectedPersonnelIds.includes('contractor')}
                                        onCheckedChange={(checked) => {
                                            setSelectedPersonnelIds(prev => 
                                                checked 
                                                    ? [...prev, 'contractor']
                                                    : prev.filter(id => id !== 'contractor')
                                            );
                                        }}
                                    />
                                    <Label htmlFor='tech-assign-contractor' className="flex items-center gap-2 font-normal w-full cursor-pointer">
                                        <Avatar className="h-9 w-9 bg-muted">
                                            <Briefcase className="h-5 w-5 m-auto text-muted-foreground" />
                                        </Avatar>
                                        Contratista Externo
                                    </Label>
                                </div>
                                {technicians.map(tech => (
                                    <div key={tech.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50">
                                        <Checkbox 
                                            id={`tech-assign-${tech.id}`}
                                            checked={selectedPersonnelIds.includes(tech.id)}
                                            onCheckedChange={(checked) => {
                                                setSelectedPersonnelIds(prev => 
                                                    checked 
                                                        ? [...prev, tech.id]
                                                        : prev.filter(id => id !== tech.id)
                                                );
                                            }}
                                        />
                                        <Label htmlFor={`tech-assign-${tech.id}`} className="flex items-center gap-2 font-normal w-full cursor-pointer">
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
                        <Button className="w-full mt-4" onClick={handleAssignPersonnel} disabled={isUpdating}>
                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Aplicar Asignación ({selectedPersonnelIds.length})
                        </Button>
                    </DialogContent>
                 </Dialog>
            </CardFooter>
          )}
        </Card>

        {(isAssignedToCurrentUser || canEdit) && !isSST && ['Asignado', 'En Progreso'].includes(ticket.status) && (
            <Card className="mb-6">
                 <CardHeader>
                    <CardTitle className="font-headline text-lg flex items-center gap-2"><Edit className="w-5 h-5" /> Actualizar Progreso</CardTitle>
                </CardHeader>
                 <CardContent>
                    <div className="space-y-4">
                         <div>
                            <label htmlFor="comment" className="text-sm font-medium">Agregar Comentario</label>
                            <Textarea id="comment" placeholder="Describe el trabajo realizado..." className="mt-1 block w-full rounded-md border-input bg-background p-2 text-sm shadow-sm focus:border-ring focus:ring focus:ring-ring focus:ring-opacity-50 min-h-[100px]" value={comment} onChange={(e) => setComment(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Adjuntar Evidencia</label>
                            <p className="text-xs text-muted-foreground mb-2">Cualquiera de los técnicos asignados puede subir la evidencia en nombre del equipo.</p>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md">
                                <div className="space-y-1 text-center">
                                    <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                                    <div className="flex text-sm text-muted-foreground">
                                        <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-ring">
                                            <span>Sube tus archivos</span>
                                            <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={(e) => handleFileChange(e, setFilesToUpload)} accept={ACCEPTED_FILE_TYPES.join(',')} />
                                        </label>
                                        <p className="pl-1">o arrastra y suelta</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Imágenes, videos o PDF, hasta 10MB</p>
                                </div>
                            </div>
                            {filesToUpload.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    <p className="text-sm font-medium">Archivos para subir:</p>
                                    <ul className="space-y-2">
                                        {filesToUpload.map((file, index) => (
                                            <li key={index} className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                                                <div className="flex items-center gap-2 truncate">
                                                    <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                    <span className="text-sm truncate" title={file.name}>{file.name}</span>
                                                </div>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeFile(index, setFilesToUpload)} className="flex-shrink-0 h-6 w-6">
                                                    <XIcon className="h-4 w-4" />
                                                </Button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                 </CardContent>
                 <CardFooter>
                    <Button className="w-full" onClick={handleProgressUpdate} disabled={isUpdating}>
                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Send className="mr-2" />
                        Enviar a Aprobación
                    </Button>
                 </CardFooter>
            </Card>
        )}

        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-lg flex items-center gap-2"><MessageSquare className="w-5 h-5" /> Historial y Comentarios</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 text-sm">
                    {isLoadingLogs ? (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : logError ? (
                        <div className="flex flex-col items-center justify-center text-center text-destructive bg-destructive/10 p-4 rounded-md">
                            <AlertCircle className="w-8 h-8 mb-2" />
                            <p className="font-semibold">Error al Cargar el Historial</p>
                            <p className="text-xs">{logError}</p>
                        </div>
                    ) : logs.length > 0 ? (
                        logs.map((log) => (
                             <div key={log.id} className="flex gap-3">
                                <div className="flex-shrink-0">
                                   <LogIcon action={log.action} />
                                </div>
                                <div className="flex-1">
                                    <p>{renderLogDescription(log)}</p>
                                    {log.details.comment && (
                                        <blockquote className="mt-1 pl-3 border-l-2 border-border italic text-muted-foreground">
                                            "{log.details.comment}"
                                        </blockquote>
                                    )}
                                    {log.details.pendingTask && (
                                        <blockquote className="mt-1 pl-3 border-l-2 border-border italic text-primary-foreground bg-primary/10 p-2 rounded-md">
                                            <strong>Tarea Pendiente:</strong> "{log.details.pendingTask}"
                                        </blockquote>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-1">
                                        <ClientFormattedDate date={log.timestamp?.toDate()} options={{ dateStyle: 'medium', timeStyle: 'short' }} />
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-muted-foreground text-center py-4">No hay historial para este ticket.</p>
                    )}
                </div>
            </CardContent>
        </Card>
        
        {/* Admin "Requires Approval" Dialog */}
        <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Observaciones para Aprobación</DialogTitle>
                    <DialogDescription>
                        Añade un comentario y adjunta archivos o una requisición para documentar por qué este ticket requiere una nueva aprobación.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="approval-observation">Observación Requerida</Label>
                        <Textarea 
                            id="approval-observation" 
                            placeholder="Ej: Se requiere revisión adicional del trabajo realizado..."
                            value={approvalObservation}
                            onChange={(e) => setApprovalObservation(e.target.value)}
                            className="min-h-[100px]"
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="requisition-select">Adjuntar Requisición (Opcional)</Label>
                        <Select onValueChange={setSelectedRequisitionId} value={selectedRequisitionId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar una requisición de servicio" />
                            </SelectTrigger>
                            <SelectContent>
                                {requisitions.map((req) => (
                                    <SelectItem key={req.id} value={req.requisitionNumber}>
                                        {req.requisitionNumber} - {req.items[0]?.product.substring(0, 40)}...
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                         <Label htmlFor="approval-files">Adjuntar Archivos (Opcional)</Label>
                         <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                                <div className="flex text-sm text-muted-foreground">
                                    <label htmlFor="approval-file-upload" className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-ring">
                                        <span>Sube tus archivos</span>
                                        <input id="approval-file-upload" name="approval-file-upload" type="file" className="sr-only" multiple onChange={(e) => handleFileChange(e, setApprovalFiles)} accept={ACCEPTED_FILE_TYPES.join(',')} />
                                    </label>
                                    <p className="pl-1">o arrastra y suelta</p>
                                </div>
                                <p className="text-xs text-muted-foreground">Imágenes, videos o PDF, hasta 10MB</p>
                            </div>
                        </div>
                        {approvalFiles.length > 0 && (
                            <div className="mt-4 space-y-2">
                                <p className="text-sm font-medium">Archivos para subir:</p>
                                <ul className="space-y-2">
                                    {approvalFiles.map((file, index) => (
                                        <li key={index} className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                                            <div className="flex items-center gap-2 truncate">
                                                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                <span className="text-sm truncate" title={file.name}>{file.name}</span>
                                            </div>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeFile(index, setApprovalFiles)} className="flex-shrink-0 h-6 w-6">
                                                <XIcon className="h-4 w-4" />
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsApprovalDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleAdminRequiresApproval} disabled={isUpdating}>
                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enviar a Aprobación
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Admin "Close Ticket" Dialog */}
        <Dialog open={isCloseTicketDialogOpen} onOpenChange={setIsCloseTicketDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Cerrar Ticket y Finalizar</DialogTitle>
                    <DialogDescription>
                        Confirma el cierre de este ticket. Puedes añadir una observación final o una tarea pendiente si es necesario.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="closing-observation">Observación Final o Tarea Pendiente (Opcional)</Label>
                        <Textarea 
                            id="closing-observation" 
                            placeholder="Ej: Se cambió el bombillo, pero se debe revisar el cableado en el próximo mantenimiento preventivo."
                            value={closingObservation}
                            onChange={(e) => setClosingObservation(e.target.value)}
                            className="min-h-[100px]"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCloseTicketDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleCloseTicket} disabled={isUpdating}>
                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar Cierre
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>


      </div>
    </div>
  );
}
