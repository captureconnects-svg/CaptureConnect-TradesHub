import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import {
  Video, Upload, Trash2, CheckCircle2, Clock, XCircle, Send, Plus,
} from "lucide-react";
import { DashboardHeader } from "@/components/trade/DashboardHeader";
import { SavedSheet } from "@/components/trade/SavedSheet";
import { fetchClientLikes } from "@/backend/client-likes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  fetchMyTestimonials,
  uploadTestimonialVideo,
  submitTestimonial,
  deleteTestimonial,
  type VideoTestimonialRecord,
} from "@/backend/testimonials";

export const Route = createFileRoute("/client-dashboard/testimonials")({
  head: () => ({
    meta: [
      { title: "My Testimonials — Capture Connect" },
      { name: "description", content: "Upload and manage your video testimonials." },
    ],
  }),
  component: TestimonialsPage,
});

const STATUS_META = {
  pending: {
    label: "Pending review",
    icon: Clock,
    classes: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    classes: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  },
  rejected: {
    label: "Not accepted",
    icon: XCircle,
    classes: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
  },
};

function StatusBadge({ status }: { status: VideoTestimonialRecord["status"] }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${meta.classes}`}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<VideoTestimonialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [liked, setLiked] = useState<string[]>([]);
  const [showLikes, setShowLikes] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    userType: "Client" as "Client" | "Tradesperson",
    description: "",
    videoFile: null as File | null,
  });
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<VideoTestimonialRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    try {
      setTestimonials(await fetchMyTestimonials());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load testimonials.");
    } finally {
      setLoading(false);
    }
  }

  async function loadProfile() {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;
    const { data: cp } = await supabase
      .from("client_profiles")
      .select("username, full_name, active_role")
      .eq("id", authData.user.id)
      .single();
    const name =
      (cp?.username as string | null)?.trim() ||
      (cp?.full_name as string | null)?.trim() ||
      "";
    const userType: "Client" | "Tradesperson" =
      cp?.active_role === true ? "Client" : "Tradesperson";
    const likedIds = await fetchClientLikes(authData.user.id);
    setDisplayName(name);
    setLiked(likedIds);
    setForm((prev) => ({ ...prev, name, userType }));
  }

  useEffect(() => { load(); loadProfile(); }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.videoFile) return;
    setUploading(true);
    setSubmitError(null);
    try {
      const videoUrl = await uploadTestimonialVideo(form.videoFile);
      const record = await submitTestimonial({
        name: form.name,
        userType: form.userType,
        description: form.description,
        videoUrl,
      });
      setTestimonials((prev) => [record, ...prev]);
      setForm((prev) => ({ ...prev, name: displayName, description: "", videoFile: null }));
      if (fileInputRef.current) fileInputRef.current.value = "";
      setModalOpen(false);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTestimonial(deleteTarget.id, deleteTarget.videoUrl);
      setTestimonials((prev) => prev.filter((t) => t.id !== deleteTarget.id));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardHeader likedCount={liked.length} onOpenLikes={() => setShowLikes(true)} />

      <main className="mx-auto max-w-4xl px-4 py-10">
        {/* Page header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">My Testimonials</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload video testimonials to share your experience. Approved testimonials appear on the Reviews page.
            </p>
          </div>
          <Button
            onClick={() => setModalOpen(true)}
            className="flex-shrink-0 bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold shadow-md"
          >
            <Plus className="mr-2 h-4 w-4" />
            Upload testimonial
          </Button>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((n) => (
              <div key={n} className="h-32 animate-pulse rounded-2xl border border-border bg-muted" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        ) : testimonials.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 py-20 text-center">
            <Video className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No testimonials yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Click "Upload testimonial" to share your story.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {testimonials.map((t) => (
              <div
                key={t.id}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-start"
              >
                {/* Thumbnail / player */}
                <div className="aspect-video w-full sm:w-48 flex-shrink-0 overflow-hidden rounded-xl bg-black">
                  <video
                    src={t.videoUrl}
                    controls
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* Details */}
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.userType}</p>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    "{t.description}"
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">
                      Submitted {formatDate(t.createdAt)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-500/10 hover:text-red-600"
                      onClick={() => setDeleteTarget(t)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Upload modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold">Upload a video testimonial</DialogTitle>
            <p className="text-sm text-muted-foreground pt-1">
              Share your TradeHub story on camera. Accepted testimonials are posted to the public Reviews page.
            </p>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="t-name">Your name</Label>
              <Input
                id="t-name"
                readOnly
                required
                value={form.name}
                className="cursor-default bg-muted text-muted-foreground"
              />
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <Label>I am a</Label>
              <div className="rounded-lg border border-amber-500 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-700 dark:text-amber-400">
                {form.userType}
              </div>
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <Label htmlFor="t-message">Brief description</Label>
              <Textarea
                id="t-message"
                placeholder="Summarise what you'll talk about in your video..."
                required
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            {/* File upload */}
            <div className="space-y-1.5">
              <Label htmlFor="t-file">Video file</Label>
              <label
                htmlFor="t-file"
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-amber-500 hover:text-foreground"
              >
                <Upload className="h-6 w-6" />
                {form.videoFile ? form.videoFile.name : "Click to choose a video file"}
                <input
                  ref={fileInputRef}
                  id="t-file"
                  type="file"
                  accept="video/*"
                  required
                  className="sr-only"
                  onChange={(e) =>
                    setForm({ ...form, videoFile: e.target.files?.[0] ?? null })
                  }
                />
              </label>
              <p className="text-xs text-muted-foreground">MP4, MOV, or WebM recommended. Max 500 MB.</p>
            </div>

            {submitError && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
                {submitError}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setModalOpen(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold"
                disabled={uploading || !form.videoFile}
              >
                {uploading ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-bounce" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <SavedSheet open={showLikes} onOpenChange={setShowLikes} />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete testimonial?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove your video testimonial. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-500 focus:ring-red-600"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
