import React, { Suspense } from 'react';
import LoginForm from './LoginForm';

export default function AdminLoginPage() {
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Login</h1>
      <Suspense fallback={<div className="rounded-xl border p-4 bg-white">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}

