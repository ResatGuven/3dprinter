// app/admin/orders/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Package,
  Printer,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronDown,
  Search,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";

// ─────────────────────────────────────────────
// Status config
// ─────────────────────────────────────────────
export const ORDER_STATUS_CONFIG = {
  PENDING: {
    label: "Beklemede",
    icon: Clock,
    variant: "outline" as const,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
  },
  CONFIRMED: {
    label: "Onaylandı",
    icon: CheckCircle2,
    variant: "outline" as const,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
  },
  PRINTING: {
    label: "Basılıyor",
    icon: Printer,
    variant: "outline" as const,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/20",
  },
  READY: {
    label: "Hazır",
    icon: Package,
    variant: "outline" as const,
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-900/20",
  },
  SHIPPED: {
    label: "Kargolandı",
    icon: Truck,
    variant: "outline" as const,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-900/20",
  },
  DELIVERED: {
    label: "Teslim Edildi",
    icon: CheckCircle2,
    variant: "default" as const,
    color: "text-green-700 dark:text-green-300",
    bg: "bg-green-100 dark:bg-green-900/30",
  },
  CANCELLED: {
    label: "İptal Edildi",
    icon: XCircle,
    variant: "destructive" as const,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
  },
  REFUNDED: {
    label: "İade Edildi",
    icon: XCircle,
    variant: "outline" as const,
    color: "text-gray-600 dark:text-gray-400",
    bg: "bg-gray-50 dark:bg-gray-900/20",
  },
} as const;

type OrderStatus = keyof typeof ORDER_STATUS_CONFIG;

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  product: { name: string; images: { url: string; isPrimary: boolean }[] };
};

type Order = {
  id: string;
  status: OrderStatus;
  customerName: string;
  customerEmail: string;
  total: number;
  orderItems: OrderItem[];
  city: string;
  createdAt: string;
};

// ─────────────────────────────────────────────
// Status Badge
// ─────────────────────────────────────────────
function StatusBadge({ status }: { status: OrderStatus }) {
  const config = ORDER_STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color} ${config.bg}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

// ─────────────────────────────────────────────
// Order Detail Dialog
// ─────────────────────────────────────────────
function OrderDetailDialog({
  order,
  onClose,
  onStatusChange,
}: {
  order: Order | null;
  onClose: () => void;
  onStatusChange: (id: string, status: OrderStatus) => void;
}) {
  if (!order) return null;
  const nextStatuses: OrderStatus[] = [
    "CONFIRMED",
    "PRINTING",
    "READY",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ];

  return (
    <Dialog open={!!order} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Sipariş #{order.id.slice(-8).toUpperCase()}</span>
            <StatusBadge status={order.status} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Customer */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
            <p className="font-medium">{order.customerName}</p>
            <p className="text-muted-foreground">{order.customerEmail}</p>
            <p className="text-muted-foreground">{order.city}</p>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Ürünler
            </p>
            {order.orderItems.map((item) => {
              const img = item.product.images.find((i) => i.isPrimary);
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-2 rounded-lg border"
                >
                  <div className="h-10 w-10 rounded-md bg-muted overflow-hidden flex-shrink-0">
                    {img && (
                      <img
                        src={img.url}
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} adet × {formatCurrency(item.price)}
                    </p>
                  </div>
                  <p className="text-sm font-mono font-medium">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Total */}
          <div className="flex justify-between items-center pt-2 border-t font-medium">
            <span>Toplam</span>
            <span className="text-lg font-mono">
              {formatCurrency(order.total)}
            </span>
          </div>

          {/* Status update */}
          <div className="pt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Durumu Güncelle
            </p>
            <div className="flex flex-wrap gap-2">
              {nextStatuses.map((s) => (
                <Button
                  key={s}
                  variant={order.status === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    onStatusChange(order.id, s);
                    onClose();
                  }}
                  disabled={order.status === s}
                >
                  {ORDER_STATUS_CONFIG[s].label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/orders?${params}`);
      const data = await res.json();
      setOrders(data.orders);
    } catch {
      toast.error("Siparişler yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusChange = async (id: string, status: OrderStatus) => {
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Sipariş durumu "${ORDER_STATUS_CONFIG[status].label}" olarak güncellendi.`);
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status } : o))
      );
    } catch {
      toast.error("Durum güncellenemedi.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Siparişler</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {orders.length} sipariş
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Müşteri adı veya e-posta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              {statusFilter === "ALL"
                ? "Tüm Durumlar"
                : ORDER_STATUS_CONFIG[statusFilter].label}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setStatusFilter("ALL")}>
              Tüm Durumlar
            </DropdownMenuItem>
            {(Object.keys(ORDER_STATUS_CONFIG) as OrderStatus[]).map((s) => (
              <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)}>
                <StatusBadge status={s} />
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sipariş No</TableHead>
              <TableHead>Müşteri</TableHead>
              <TableHead>Ürünler</TableHead>
              <TableHead>Şehir</TableHead>
              <TableHead className="text-right">Tutar</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : orders.map((order) => (
                  <TableRow key={order.id} className="group cursor-pointer">
                    <TableCell className="font-mono text-xs font-medium">
                      #{order.id.slice(-8).toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">
                          {order.customerName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.customerEmail}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {order.orderItems.length} kalem
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{order.city}</TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(order.total)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex items-center gap-1">
                            <StatusBadge status={order.status} />
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {(
                            Object.keys(
                              ORDER_STATUS_CONFIG
                            ) as OrderStatus[]
                          ).map((s) => (
                            <DropdownMenuItem
                              key={s}
                              onClick={() =>
                                handleStatusChange(order.id, s)
                              }
                              className={
                                order.status === s ? "font-medium" : ""
                              }
                            >
                              <StatusBadge status={s} />
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      <OrderDetailDialog
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
