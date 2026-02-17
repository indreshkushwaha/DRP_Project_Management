import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-4">
          <div className="text-zinc-500">Loading…</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
