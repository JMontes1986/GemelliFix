
'use strict';
import 'dotenv/config';
/**
 * @fileOverview Cloud Functions for Firebase.
 * Este archivo está destinado a la lógica de backend que responde a eventos de Firebase.
 * Se ha eliminado la lógica de Custom Claims para unificar los permisos en las reglas de Firestore.
 */

import { getAdminApp } from '@/lib/firebaseAdmin';
import { getMessaging } from 'firebase-admin/messaging';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onRequest } from 'firebase-functions/v2/https';

/**
 * Triggered when a new document is created in the 'users' collection.
 * La lógica de claims ha sido removida. Esta función se puede usar para otras automatizaciones,
 * como enviar un correo de bienvenida.
 */
export const onUserCreated = onDocumentCreated('users/{userId}', (event) => {
    const user = event.data?.data();
    if (!user) {
        console.log('No user data found in the creation event.');
        return;
    }
    console.log(`New user created: ${user.email} with role ${user.role}`);
    // Aquí se podrían añadir otras lógicas, como enviar un email de bienvenida.
});

/**
 * Triggered when a document in the 'users' collection is updated.
 * La lógica de claims ha sido removida. Esta función puede usarse para auditar cambios de rol.
 */
export const onUserUpdated = onDocumentUpdated('users/{userId}', (event) => {
    const dataAfter = event.data?.after.data();
    const dataBefore = event.data?.before.data();
    
    if (!dataAfter || !dataBefore) {
        console.log('User data missing in the update event.');
        return;
    }

    if (dataAfter.role !== dataBefore.role) {
        console.log(`Role changed for user ${event.params.userId} from ${dataBefore.role} to ${dataAfter.role}.`);
        // Aquí se podrían añadir otras lógicas, como registrar el cambio en un log de auditoría.
    }
});


/**
 * An HTTP-triggered function to send a test notification using FCM.
 * This function can be called via its URL to send a message to the 'test' topic.
 */
export const sendTestNotification = onRequest(async (req, res) => {
    // Inicializa la aplicación de administrador a través de la función centralizada.
    const adminApp = getAdminApp();
    const message = {
        notification: {
            title: '¡Notificación de Prueba!',
            body: 'Si recibes esto, ¡el servidor de notificaciones funciona!',
        },
        data: {
            score: '850',
            time: '2:45',
        },
        topic: 'test', // Send to a specific topic
    };

    try {
        // Send a message to the devices subscribed to the provided topic.
        const response = await getMessaging(adminApp).send(message);
        console.log('Successfully sent message:', response);
        res.status(200).send({ success: true, message: `Successfully sent message: ${response}` });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).send({ success: false, error: 'Error sending message' });
    }
});
