
'use strict';
/**
 * @fileOverview Cloud Functions for Firebase.
 * This file contains the backend logic that responds to events in Firebase,
 * such as creating or updating a user document, and performs actions like setting custom claims.
 */

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';

// Initialize the Firebase Admin SDK.
initializeApp();

/**
 * Sets custom claims for a user based on their role in Firestore.
 * This function is triggered for both creation and updates of user documents.
 * @param {string} uid - The user's ID.
 * @param {string} role - The user's role from the Firestore document.
 */
const setRoleClaim = async (uid: string, role: string) => {
    const claims: {[key: string]: any} = {
        role: role, // Set the role directly
    };

    try {
        // Set the custom claims on the user's auth token.
        await getAuth().setCustomUserClaims(uid, claims);
        console.log(`Successfully set custom claims for user ${uid}:`, claims);
    } catch (error) {
        console.error(`Error setting custom claims for user ${uid}:`, error);
    }
};

/**
 * Triggered when a new document is created in the 'users' collection.
 * This function reads the new user's role and sets a custom claim.
 */
export const onUserCreated = onDocumentCreated('users/{userId}', async (event) => {
    const user = event.data?.data();
    if (!user) {
        console.log('No user data found in the creation event.');
        return;
    }
    const uid = event.params.userId;
    const role = user.role;
    await setRoleClaim(uid, role);
});

/**
 * Triggered when a document in the 'users' collection is updated.
 * This function checks if the 'role' field has changed and updates the custom claim accordingly.
 */
export const onUserUpdated = onDocumentUpdated('users/{userId}', async (event) => {
    const dataAfter = event.data?.after.data();
    const dataBefore = event.data?.before.data();
    
    if (!dataAfter || !dataBefore) {
        console.log('User data missing in the update event.');
        return;
    }

    // Update claims only if the role has actually changed.
    if (dataAfter.role !== dataBefore.role) {
        console.log(`Role changed for user ${event.params.userId} from ${dataBefore.role} to ${dataAfter.role}. Updating claims.`);
        const uid = event.params.userId;
        const newRole = dataAfter.role;
        await setRoleClaim(uid, newRole);
    }
});
