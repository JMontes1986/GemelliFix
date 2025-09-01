import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { User, Ticket, Log } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function createLog(
  user: User,
  action: Log['action'],
  details: {
    ticket?: Ticket;
    oldValue?: any;
    newValue?: any;
    comment?: string;
    requisitionId?: string;
    pendingTask?: string;
  } = {}
) {
  if (!user) return;

  try {
    const logDetails: Log['details'] = {
        // description is no longer pre-formatted here. It will be constructed on the client.
    };

    if (details.ticket) {
      logDetails.ticketId = details.ticket.id;
      logDetails.ticketCode = details.ticket.code;
    }
    if (details.comment) {
        logDetails.comment = details.comment;
    }
    if (details.requisitionId) {
        logDetails.requisitionId = details.requisitionId;
    }
    if (details.pendingTask) {
        logDetails.pendingTask = details.pendingTask;
    }
    if (details.oldValue !== undefined) {
      logDetails.oldValue = Array.isArray(details.oldValue)
        ? details.oldValue.join(', ')
        : String(details.oldValue);
    }
    if (details.newValue !== undefined) {
      logDetails.newValue = Array.isArray(details.newValue)
        ? details.newValue.join(', ')
        : String(details.newValue);
    }
    
    // For updates, capture the field being changed
    if (action.startsWith('update_')) {
        logDetails.field = action.replace('update_', '') as Log['details']['field'];
    }

    const userId = user.id || user.uid;
    if (!userId) {
      console.error("Could not determine user ID for logging.");
      return;
    }

    await addDoc(collection(db, 'logs'), {
      userId: userId,
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
