
// This file is used to parse the service account credentials from a Base64 encoded environment variable.
// This is the recommended approach for environments like Vercel or GitHub Actions to avoid issues with newline characters in private keys.

const serviceAccountB64 = process.env.FB_SERVICE_ACCOUNT_B64;

if (!serviceAccountB64) {
    throw new Error('The FB_SERVICE_ACCOUNT_B64 environment variable is not set. Please encode your service account JSON file to Base64 and set it.');
}

try {
    const decodedServiceAccount = Buffer.from(serviceAccountB64, 'base64').toString('utf8');
    const serviceAccount = JSON.parse(decodedServiceAccount);

    // Ensure the private_key has the correct newline characters.
    // While Base64 should preserve this, this is an extra layer of safety.
    if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    module.exports = { serviceAccount };

} catch (error: any) {
    console.error("Failed to parse the Base64 encoded service account. Make sure it's a valid Base64 string from your service account JSON file.", error);
    throw new Error("Could not parse the FB_SERVICE_ACCOUNT_B64 environment variable. " + error.message);
}
