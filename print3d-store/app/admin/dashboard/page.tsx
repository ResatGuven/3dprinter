// app/admin/dashboard/page.tsx
import { Suspense } from "react";
import {
  ShoppingCart,
  Package,
  TrendingUp,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { SalesChart } from "@/components/admin/SalesChart";
import { TopProductsChart } from "@/components/admin/TopProductsChart";

// ─────────────────────────────────────────────
// Data fetching (server component)
// ─────────────────────────────────────────────
async function getDashboardStats() {
  const [
    totalOrders,
    totalRevenue,
    pendingOrders,
    totalProducts,
    recentOrders,
    topProducts,
    salesByDay,
    filamentStats,
  ] = await Promise.all([
    // Total orders
    prisma.order.count(),

    // Total revenue (delivered + shipped)
    prisma.order.aggregate({
      _sum: { total: true },
      where: { status: { in: ["DELIVERED", "SHIPPED"] } },
    }),

    // Pending / printing orders
    prisma.order.count({
      where: { status: { in: ["PENDING", "CONFIRMED", "PRINTING", "READY"] } },
    }),

    // Total active products
    prisma.product.count({ where: { isActive: true } }),

    // Recent 5 orders
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        customerName: true,
        total: true,
        status: true,
        createdAt: true,
        orderItems: { select: { quantity: true } },
      },
    }),

    // Top 5 products by order count
    prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),

    // Sales last 30 days grouped by day
    prisma.$queryRaw<{ day: string; revenue: number; orders: number }[]>`
      SELECT
        DATE(created_at)::text AS day,
        COALESCE(SUM(total), 0)::float AS revenue,
        COUNT(*)::int AS orders
      FROM "Order"
      WHERE
        status IN ('DELIVERED', 'SHIPPED')
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `,

    // Filament breakdown
    prisma.product.groupBy({
      by: ["filamentType"],
      _sum: { stock: true },
      _count: { id: true },
    }),
  ]);

  // Resolve product names for topProducts
  const productIds = topProducts.map((t) => t.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, filamentType: true },
  });
  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

  return {
    totalOrders,
    totalRevenue: Number(totalRevenue._sum.total ?? 0),
    pendingOrders,
    totalProducts,
    recentOrders,
    topProducts: topProducts.map((t) => ({
      ...productMap[t.productId],
      count: t._sum.quantity ?? 0,
    })),
    salesByDay,
    filamentStats,
  };
}

// ─────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────
function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  trend,
  trendLabel,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-medium">
          {title}
        </span>
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {sub && (
          <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
        )}
      </div>
      {trendLabel && (
        <div className="flex items-center gap-1">
          {trend === "up" ? (
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
          ) : trend === "down" ? (
            <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
          ) : null}
          <span
            className={`text-xs font-medium ${
              trend === "up"
                ? "text-emerald-600 dark:text-emerald-400"
                : trend === "down"
                ? "text-red-600 dark:text-red-400"
                : "text-muted-foreground"
            }`}
          >
            {trendLabel}
          </span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Filament stock widget
// ─────────────────────────────────────────────
const FILAMENT_COLORS: Record<string, string> = {
  PLA: "bg-blue-500",
  PETG: "bg-purple-500",
  ABS: "bg-orange-500",
  TPU: "bg-pink-500",
  RESIN: "bg-teal-500",
  NYLON: "bg-amber-500",
  ASA: "bg-red-500",
};

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────
export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-8">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Mağaza genel durumu ve istatistikler
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Toplam Gelir"
          value={formatCurrency(stats.totalRevenue)}
          icon={TrendingUp}
          trend="up"
          trendLabel="Son 30 güne göre"
        />
        <StatCard
          title="Toplam Sipariş"
          value={stats.totalOrders.toString()}
          sub={`${stats.pendingOrders} sipariş işlemde`}
          icon={ShoppingCart}
        />
        <StatCard
          title="Aktif Ürün"
          value={stats.totalProducts.toString()}
          icon={Package}
        />
        <StatCard
          title="Aktif Baskı"
          value={stats.pendingOrders.toString()}
          sub="Hazırlanıyor / Basılıyor"
          icon={Printer}
          trend={stats.pendingOrders > 10 ? "up" : "neutral"}
          trendLabel={stats.pendingOrders > 10 ? "Yoğun" : "Normal yük"}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Sales chart */}
        <div className="xl:col-span-2 rounded-xl border bg-card p-5">
          <h2 className="font-semibold mb-4">Son 30 Gün Satışlar</h2>
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <SalesChart data={stats.salesByDay} />
          </Suspense>
        </div>

        {/* Top products */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold mb-4">En Çok Satılan</h2>
          <div className="space-y-3">
            {stats.topProducts.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-2xl font-bold text-muted-foreground/30 w-6 text-center">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      {p.filamentType}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {p.count} adet
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent orders */}
        <div className="xl:col-span-2 rounded-xl border bg-card p-5">
          <h2 className="font-semibold mb-4">Son Siparişler</h2>
          <div className="space-y-2">
            {stats.recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {order.customerName}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    #{order.id.slice(-8).toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-medium">
                    {formatCurrency(Number(order.total))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {order.orderItems.reduce((a, b) => a + b.quantity, 0)} ürün
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] w-20 justify-center"
                >
                  {order.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Filament stock */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold mb-4">Filament Stok Durumu</h2>
          <div className="space-y-3">
            {stats.filamentStats.map((f) => {
              const maxStock = Math.max(
                ...stats.filamentStats.map((s) => s._sum.stock ?? 0)
              );
              const stock = f._sum.stock ?? 0;
              const pct = maxStock > 0 ? (stock / maxStock) * 100 : 0;
              return (
                <div key={f.filamentType}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-medium font-mono">
                      {f.filamentType}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {stock} adet
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        FILAMENT_COLORS[f.filamentType] ?? "bg-primary"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
