import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Edit,
  Loader2,
  MessageSquareQuote,
  Plus,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CachedAvatar } from "@/components/ui/cached-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveConfirm } from "@/components/ui/responsive-confirm";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  createManualTestimonial,
  deleteTestimonial,
  subscribeToAllTestimonials,
  updateTestimonial,
} from "@/services/testimonialsService";
import type { Testimonial, TestimonialFormData } from "@/types/testimonial";

const emptyForm = (): TestimonialFormData => ({
  name: "",
  role: "",
  text: "",
  stars: 5,
  photoURL: "",
});

const AdminTestimonials = () => {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [form, setForm] = useState<TestimonialFormData>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Testimonial | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const tt = t.admin.testimonials;

  useEffect(() => {
    const unsub = subscribeToAllTestimonials((data) => {
      setItems(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    if (filter === "pending") return items.filter((x) => !x.approved);
    if (filter === "approved") return items.filter((x) => x.approved);
    return items;
  }, [items, filter]);

  const pendingCount = items.filter((x) => !x.approved).length;

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setEditorOpen(true);
  };

  const openEdit = (item: Testimonial) => {
    setEditing(item);
    setForm({
      name: item.name,
      role: item.role,
      text: item.text,
      stars: item.stars,
      photoURL: item.photoURL ?? "",
    });
    setEditorOpen(true);
  };

  const handlePhotoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: t.common.error, variant: "destructive" });
      return;
    }
    setUploadingPhoto(true);
    try {
      const url = await uploadImageToCloudinary(file, "testimonials");
      setForm((f) => ({ ...f, photoURL: url }));
    } catch (e) {
      console.error(e);
      toast({ title: t.common.error, variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.text.trim()) {
      toast({ title: tt.toast.missingFields, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateTestimonial(editing.id, form);
        toast({ title: tt.toast.updated });
      } else {
        await createManualTestimonial(form);
        toast({ title: tt.toast.created });
      }
      setEditorOpen(false);
    } catch (e) {
      console.error(e);
      toast({ title: t.common.error, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (item: Testimonial, approved: boolean) => {
    try {
      await updateTestimonial(item.id, { approved });
      toast({ title: approved ? tt.toast.approved : tt.toast.unapproved });
    } catch (e) {
      console.error(e);
      toast({ title: t.common.error, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteTestimonial(confirmDelete.id);
      toast({ title: tt.toast.deleted });
    } catch (e) {
      console.error(e);
      toast({ title: t.common.error, variant: "destructive" });
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-8 pb-24 md:pb-8 space-y-4 max-w-5xl mx-auto">
        <AdminPageHeader
          title={tt.title}
          description={tt.description}
          action={{ label: tt.addAction, onClick: openNew, icon: Plus }}
        />

        <div className="flex items-center gap-2 flex-wrap">
          {(["all", "pending", "approved"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition",
                filter === k
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border hover:border-primary/50 text-muted-foreground",
              )}
            >
              {tt.filters[k]}
              {k === "pending" && pendingCount > 0 && (
                <span
                  className={cn(
                    "ml-1.5 rounded-full px-1.5 text-[10px]",
                    filter === k
                      ? "bg-primary-foreground/20"
                      : "bg-amber-500/20 text-amber-700",
                  )}
                >
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[40vh]">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <AdminEmptyState
            icon={MessageSquareQuote}
            title={tt.empty.title}
            description={tt.empty.description}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((item) => (
              <Card key={item.id} className="border-border/60">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <CachedAvatar
                      src={item.photoURL}
                      alt={item.name}
                      fallback={item.name.charAt(0).toUpperCase()}
                      className="h-10 w-10 shrink-0"
                      fallbackClassName="bg-primary/15 text-primary text-sm font-semibold"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">{item.name}</p>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] uppercase tracking-wide",
                            item.source === "athlete"
                              ? "bg-blue-500/10 text-blue-700"
                              : "bg-muted",
                          )}
                        >
                          {item.source === "athlete" ? tt.fromAthlete : tt.manual}
                        </Badge>
                        {!item.approved && (
                          <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-700">
                            {tt.pending}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{item.role}</p>
                    </div>
                    <div className="flex shrink-0">
                      {Array.from({ length: item.stars }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                      ))}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground italic line-clamp-4">
                    "{item.text}"
                  </p>

                  <div className="flex items-center gap-2 flex-wrap">
                    {item.approved ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApprove(item, false)}
                        className="gap-1.5"
                      >
                        <X className="h-3.5 w-3.5" />
                        {tt.unapprove}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleApprove(item, true)}
                        className="gap-1.5"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {tt.approve}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(item)}
                      className="gap-1.5"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      {tt.edit}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmDelete(item)}
                      className="gap-1.5 text-destructive hover:bg-destructive/10 ml-auto"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ResponsiveModal
        open={editorOpen}
        onOpenChange={setEditorOpen}
        title={editing ? tt.editTitle : tt.addTitle}
        description={tt.formDescription}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="t-name">{tt.fields.name}</Label>
            <Input
              id="t-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={tt.fields.namePlaceholder}
            />
          </div>
          <div>
            <Label htmlFor="t-role">{tt.fields.role}</Label>
            <Input
              id="t-role"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              placeholder={tt.fields.rolePlaceholder}
            />
          </div>
          <div>
            <Label>{tt.fields.photo}</Label>
            {form.photoURL ? (
              <div className="flex items-center gap-3 mt-1">
                <img
                  src={form.photoURL}
                  alt=""
                  className="h-16 w-16 rounded-full object-cover border border-border"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setForm((f) => ({ ...f, photoURL: "" }))}
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  {tt.fields.removePhoto}
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => document.getElementById("testimonial-photo-input")?.click()}
                disabled={uploadingPhoto}
                className="mt-1 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-muted/40 transition disabled:opacity-50"
              >
                {uploadingPhoto ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                <span className="text-sm">{tt.fields.uploadPhoto}</span>
              </button>
            )}
            <input
              id="testimonial-photo-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePhotoUpload(file);
                e.target.value = "";
              }}
            />
          </div>
          <div>
            <Label>{tt.fields.stars}</Label>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, stars: n }))}
                  className="p-1"
                  aria-label={`${n} stars`}
                >
                  <Star
                    className={cn(
                      "h-6 w-6 transition",
                      n <= form.stars
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-muted-foreground/40",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="t-text">{tt.fields.text}</Label>
            <Textarea
              id="t-text"
              value={form.text}
              onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
              placeholder={tt.fields.textPlaceholder}
              rows={5}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {tt.save}
            </Button>
          </div>
        </div>
      </ResponsiveModal>

      <ResponsiveConfirm
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title={tt.deleteConfirmTitle}
        description={tt.deleteConfirmDescription.replace(
          "{{name}}",
          confirmDelete?.name ?? "",
        )}
        confirmLabel={tt.delete}
        onConfirm={handleDelete}
        destructive
      />
    </AdminLayout>
  );
};

export default AdminTestimonials;
