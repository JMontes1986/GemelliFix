
'use strict';
/**
 * @fileOverview Cloud Functions for Firebase.
 * This file contains the backend logic that responds to events in Firebase,
 * such as creating a new user, and performs actions like setting custom claims.
 */

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

// Initialize the Firebase Admin SDK.
initializeApp();

/**
 * Triggered when a new document is created in the 'users' collection.
 * This function reads the user's role from the document and sets a custom
 * claim on their Firebase Authentication token.
 *
 * This allows security rules to check for an admin role without needing to
 * read from Firestore, which solves permission issues.
 */
export const setCustomClaims = onDocumentCreated('users/{userId}', async (event) => {
    const user = event.data?.data();
    if (!user) {
        console.log('No user data found in the event.');
        return;
    }

    const uid = event.params.userId;
    const role = user.role;
    
    const claims: {[key: string]: any} = {};

    // Set the 'admin' claim to true only if the role is 'Administrador'.
    if (role === 'Administrador') {
        claims['admin'] = true;
    } else {
        claims['admin'] = false; // Explicitly set to false for other roles
    }

    try {
        // Set the custom claims on the user's auth token.
        await getAuth().setCustomUserClaims(uid, claims);
        console.log(`Successfully set custom claims for user ${uid}:`, claims);
    } catch (error) {
        console.error(`Error setting custom claims for user ${uid}:`, error);
    }
});
