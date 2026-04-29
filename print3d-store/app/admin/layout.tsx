// app/admin/layout.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <AdminHeader user={session.user} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// components/admin/AdminSidebar.tsx
// ─────────────────────────────────────────────

// "use client";
// import Link from "next/link";
// import { usePathname } from "next/navigation";
// import {
//   LayoutDashboard, Package, ShoppingCart, BarChart2,
//   Settings, Printer, Tag, ChevronRight,
// } from "lucide-react";
// import { cn } from "@/lib/utils";
//
// const NAV_ITEMS = [
//   { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
//   { href: "/admin/products",  label: "Ürünler",   icon: Package },
//   { href: "/admin/orders",    label: "Siparişler", icon: ShoppingCart },
//   { href: "/admin/categories",label: "Kategoriler",icon: Tag },
//   { href: "/admin/stats",     label: "İstatistikler", icon: BarChart2 },
//   { href: "/admin/settings",  label: "Ayarlar",   icon: Settings },
// ];
//
// export function AdminSidebar() {
//   const path = usePathname();
//   return (
//     <aside className="w-60 border-r bg-card flex flex-col">
//       <div className="p-5 border-b flex items-center gap-2.5">
//         <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
//           <Printer className="h-4 w-4 text-primary-foreground" />
//         </div>
//         <div>
//           <p className="font-bold text-sm leading-tight">Print3D Admin</p>
//           <p className="text-[10px] text-muted-foreground">Yönetim Paneli</p>
//         </div>
//       </div>
//       <nav className="flex-1 p-3 space-y-0.5">
//         {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
//           const active = path.startsWith(href);
//           return (
//             <Link key={href} href={href}
//               className={cn(
//                 "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
//                 active
//                   ? "bg-primary text-primary-foreground font-medium"
//                   : "text-muted-foreground hover:bg-muted hover:text-foreground"
//               )}
//             >
//               <Icon className="h-4 w-4 flex-shrink-0" />
//               <span className="flex-1">{label}</span>
//               {active && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
//             </Link>
//           );
//         })}
//       </nav>
//     </aside>
//   );
// }
