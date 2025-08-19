
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { User, Ticket } from './types';


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export async function createLog(
    user: User, 
    action: 'login' | 'update_status' | 'update_priority' | 'update_assignment',
    details: {
        ticket?: Ticket,
        oldValue?: any,
        newValue?: any,
    } = {}
) {
    if (!user) return;

    try {
        let logDetails: any = {
            description: `User ${user.email} performed action: ${action}`
        };

        if (action === 'login') {
            logDetails.description = `User ${user.email} logged in.`;
        }

        if (details.ticket) {
            logDetails.ticketId = details.ticket.id;
            logDetails.ticketCode = details.ticket.code;
        }
        if (details.oldValue !== undefined) {
             logDetails.oldValue = Array.isArray(details.oldValue) ? details.oldValue.join(', ') : details.oldValue;
        }
        if (details.newValue !== undefined) {
            logDetails.newValue = Array.isArray(details.newValue) ? details.newValue.join(', ') : details.newValue;
        }

        if (action.startsWith('update')) {
             logDetails.field = action.split('_')[1];
             logDetails.description = `User ${user.email} updated ${logDetails.field} on ticket ${logDetails.ticketCode} from '${logDetails.oldValue}' to '${logDetails.newValue}'.`
        }


        await addDoc(collection(db, 'logs'), {
            userId: user.id,
            userEmail: user.email,
            userName: user.name,
            action: action,
            timestamp: serverTimestamp(),
            details: logDetails
        });

    } catch (error) {
        console.error("Error creating log:", error);
    }
}
