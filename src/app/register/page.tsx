
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page is intentionally left blank and redirects to the login page.
// User creation should be handled by an administrator in the settings panel.
export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/login');
  }, [router]);

  return null; // Render nothing while redirecting
}
