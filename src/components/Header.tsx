import { Bell, Search, UserCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="flex h-16 items-center gap-4 border-b bg-white px-6">
      <div className="flex-1">
        <form>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              type="search"
              placeholder="Buscar cliente, obra ou pedido..."
              className="w-full appearance-none bg-slate-50 pl-8 shadow-none md:w-2/3 lg:w-1/3"
            />
          </div>
        </form>
      </div>
      <Button variant="ghost" size="icon">
        <Bell className="h-5 w-5 text-slate-500" />
        <span className="sr-only">Notificações</span>
      </Button>
      <Button variant="ghost" size="icon" className="rounded-full">
        <UserCircle className="h-6 w-6 text-slate-700" />
        <span className="sr-only">Minha conta</span>
      </Button>
    </header>
  );
}
