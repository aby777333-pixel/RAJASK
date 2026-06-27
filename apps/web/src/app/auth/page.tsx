import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center bg-obsidian" />}>
      <AuthForm />
    </Suspense>
  );
}
