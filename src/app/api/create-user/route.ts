
// This file is intentionally left blank.
// The logic has been moved to a more robust Cloud Function in `src/functions/index.ts`.
// Keeping the file prevents potential 404 errors if old clients still try to access it,
// but it performs no actions. A proper solution would be to remove this file and
// ensure all clients are updated, but this is a safe fallback.
import { NextResponse } from 'next/server';

export async function POST() {
    return NextResponse.json({ message: 'This endpoint is deprecated. User creation is handled by Cloud Functions.' }, { status: 410 });
}
