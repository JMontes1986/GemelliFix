import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { User, Ticket } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function createLog(
  user: User,
  action:
    | 'login'
    | 'update_status'
    | 'update_priority'
    | 'update_assignment'
    | 'create_ticket'
    | 'add_comment',
  details: {
    ticket?: Ticket;
    oldValue?: any;
    newValue?: any;
    comment?: string;
  } = {}
) {
  if (!user) return;

  try {
    let logDetails: any = {
      description: `<strong>${user.name}</strong> realizó la acción: ${action}`,
      comment: details.comment || null,
    };

    if (action === 'login') {
      logDetails.description = `<strong>${user.name}</strong> inició sesión.`;
    }

    if (action === 'create_ticket' && details.ticket) {
      logDetails.description = `<strong>${user.name}</strong> creó el ticket.`;
    }

    if (action === 'add_comment' && details.comment) {
      logDetails.description = `<strong>${user.name}</strong> añadió un comentario.`;
    }

    if (details.ticket) {
      logDetails.ticketId = details.ticket.id;
      logDetails.ticketCode = details.ticket.code;
    }
    if (details.oldValue !== undefined) {
      logDetails.oldValue = Array.isArray(details.oldValue)
        ? details.oldValue.join(', ')
        : details.oldValue;
    }
    if (details.newValue !== undefined) {
      logDetails.newValue = Array.isArray(details.newValue)
        ? details.newValue.join(', ')
        : details.newValue;
    }

    if (action.startsWith('update')) {
      const fieldMap: Record<string, string> = {
        status: 'estado',
        priority: 'prioridad',
        assignment: 'asignación',
      };
      const field = action.split('_')[1];
      const friendlyField = fieldMap[field] || field;

      logDetails.field = field;
      logDetails.description = `<strong>${user.name}</strong> actualizó la <strong>${friendlyField}</strong> de '${
        logDetails.oldValue || 'ninguno'
      }' a '<strong>${logDetails.newValue || 'ninguno'}</strong>'.`;
    }

    await addDoc(collection(db, 'logs'), {
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      action: action,
      timestamp: serverTimestamp(),
      details: logDetails,
    });
  } catch (error) {
    console.error('Error creating log:', error);
  }
}
