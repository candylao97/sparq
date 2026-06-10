"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { serviceSchema, type ServiceInput } from "@/server/validation/service.schema";
import type { Service } from "@/types";

type ServiceType = "NAILS" | "LASHES";

const CATEGORY_OPTIONS = [
  { value: "NAILS", label: "Nails" },
  { value: "LASHES", label: "Lashes" },
] as const;

const SERVICE_TYPE_OPTIONS = [
  { value: "NAILS", label: "Nails" },
  { value: "LASHES", label: "Lashes" },
] as const;

export default function ProviderServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [savingServiceTypes, setSavingServiceTypes] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ServiceInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(serviceSchema) as any,
    defaultValues: {
      isActive: true,
      serviceMode: "STUDIO",
      category: "NAILS",
    },
  });

  useEffect(() => {
    loadServices();
    fetch("/api/providers/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.serviceTypes)) {
          setServiceTypes(data.serviceTypes as ServiceType[]);
        }
      })
      .catch(() => {});
  }, []);

  function toggleServiceType(value: ServiceType) {
    setServiceTypes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  async function saveServiceTypes() {
    setSavingServiceTypes(true);
    try {
      const res = await fetch("/api/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceTypes }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Save failed");
      }
      toast.success("Service types saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save service types");
    } finally {
      setSavingServiceTypes(false);
    }
  }

  async function loadServices() {
    try {
      const res = await fetch("/api/services");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setServices(Array.isArray(data) ? data : data.services ?? []);
    } catch {
      toast.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setEditingService(null);
    reset({ isActive: true, serviceMode: "STUDIO", category: "NAILS" });
    setDialogOpen(true);
  }

  function openEdit(service: Service) {
    setEditingService(service);
    reset({
      title: service.title,
      category: service.category as "NAILS" | "LASHES",
      description: service.description ?? "",
      durationMinutes: service.durationMinutes,
      basePrice: service.basePrice / 100,
      serviceMode: service.serviceMode as "STUDIO" | "MOBILE" | "BOTH",
      isActive: service.isActive,
    });
    setDialogOpen(true);
  }

  async function onSubmit(data: ServiceInput) {
    setSubmitting(true);
    try {
      const isEdit = !!editingService;
      const basePayload = { ...data, basePrice: Math.round(data.basePrice * 100) };
      const payload = isEdit ? { ...basePayload, id: editingService!.id } : basePayload;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch("/api/services", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed");
      }
      const saved = await res.json();
      if (isEdit) {
        setServices((prev) => prev.map((s) => (s.id === editingService!.id ? saved : s)));
        toast.success("Service updated");
      } else {
        setServices((prev) => [...prev, saved]);
        toast.success("Service added");
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save service");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteService(id: string) {
    if (!confirm("Delete this service?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/services?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setServices((prev) => prev.filter((s) => s.id !== id));
      toast.success("Service deleted");
    } catch {
      toast.error("Failed to delete service");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Services</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage the services you offer</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="size-4 mr-1.5" />
          Add service
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Service types</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            The categories of services you offer. This controls how customers discover you.
          </p>
          <div className="flex gap-3">
            {SERVICE_TYPE_OPTIONS.map(({ value, label }) => {
              const checked = serviceTypes.includes(value);
              return (
                <label key={value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleServiceType(value)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-sm font-medium">{label}</span>
                </label>
              );
            })}
          </div>
          <Button
            onClick={saveServiceTypes}
            disabled={savingServiceTypes || serviceTypes.length === 0}
            variant="outline"
          >
            {savingServiceTypes ? "Saving..." : "Save service types"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your services ({services.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : services.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">No services yet.</p>
              <Button className="mt-4" onClick={openNew}>
                <Plus className="size-4 mr-1.5" />
                Add your first service
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {services.map((service) => (
                <div key={service.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{service.title}</span>
                      <Badge variant={service.isActive ? "blue" : "gray"}>
                        {service.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="outline">{service.category}</Badge>
                    </div>
                    {service.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {service.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{service.durationMinutes} min</span>
                      <span>&middot;</span>
                      <span>${(service.basePrice / 100).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="icon" variant="outline" onClick={() => openEdit(service)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => deleteService(service.id)}
                      disabled={deletingId === service.id}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingService ? "Edit service" : "Add new service"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...register("title")} placeholder="e.g. Gel manicure" />
              {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <div className="flex gap-3">
                    {CATEGORY_OPTIONS.map(({ value, label }) => (
                      <label key={value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          className="sr-only"
                          value={value}
                          checked={field.value === value}
                          onChange={() => field.onChange(value)}
                        />
                        <span
                          className={`border rounded-lg px-3 py-1.5 text-sm font-medium cursor-pointer transition ${
                            field.value === value
                              ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                              : "border-border hover:border-muted-foreground"
                          }`}
                        >
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea id="description" rows={2} {...register("description")} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="durationMinutes">Duration (min)</Label>
                <Input
                  id="durationMinutes"
                  type="number"
                  min={15}
                  step={15}
                  {...register("durationMinutes", { valueAsNumber: true })}
                />
                {errors.durationMinutes && (
                  <p className="text-sm text-red-500">{errors.durationMinutes.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="basePrice">Price ($)</Label>
                <Input
                  id="basePrice"
                  type="number"
                  min={1}
                  step={0.01}
                  {...register("basePrice", { valueAsNumber: true })}
                />
                {errors.basePrice && (
                  <p className="text-sm text-red-500">{errors.basePrice.message}</p>
                )}
              </div>
            </div>

            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-3">
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <Label>Active</Label>
                </div>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : editingService ? "Save changes" : "Add service"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
