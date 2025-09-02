

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { User, Ticket, Log, Requisition } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function createLog(
  user: User,
  action: Log['action'],
  details: {
    ticket?: Ticket;
    requisition?: Requisition;
    oldValue?: any;
    newValue?: any;
    comment?: string;
    requisitionId?: string;
    pendingTask?: string;
    productName?: string;
    field?: string;
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
    if (details.requisition) {
        logDetails.requisitionId = details.requisition.id;
        logDetails.requisitionNumber = details.requisition.requisitionNumber;
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
    if (details.productName) {
        logDetails.productName = details.productName;
    }
    
    // For updates, capture the field being changed
    if (action.startsWith('update_') || details.field) {
        logDetails.field = details.field || action.replace('update_', '');
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
