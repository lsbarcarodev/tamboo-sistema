"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { AuthGuard } from "@/components/AuthGuard";
import { InstallPrompt } from "@/components/InstallPrompt";

export function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMotorista = pathname === "/motorista" || pathname.startsWith("/motorista/");
  const isLogin = pathname.startsWith("/login");
  const isMotoristaLogin = pathname === "/login/motorista";

  if (isLogin) {
    return (
      <AuthGuard>
        {isMotoristaLogin && <InstallPrompt />}
        {children}
      </AuthGuard>
    );
  }

  if (isMotorista) {
    return (
      <AuthGuard>
        <div className="flex flex-col min-h-screen w-full bg-slate-50">
          <InstallPrompt />
          <main className="flex-1 w-full max-w-md mx-auto relative shadow-xl overflow-hidden bg-white">
            {children}
          </main>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <div className="flex flex-col w-full flex-1">
          <main className="flex-1 p-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
