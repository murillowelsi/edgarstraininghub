import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Search, UserPlus, X } from "lucide-react";
import { CachedAvatar } from "@/components/ui/cached-avatar";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { getAllUsers } from "@/services/usersService";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { User } from "@/types/user";
import type { WorkoutSummary } from "@/types/timeline";
import { WorkoutSummaryCard } from "./WorkoutSummaryCard";

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (caption: string, imageUrl?: string, mentionedUserIds?: string[]) => Promise<void>;
  initialCaption?: string;
  initialImageUrl?: string;
  workoutSummary?: WorkoutSummary;
  title?: string;
  submitLabel?: string;
}

export function CreatePostModal({ open, onOpenChange, onSubmit, initialCaption, initialImageUrl, workoutSummary, title, submitLabel }: CreatePostModalProps) {
  const { user, displayName, photoURL } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [caption, setCaption] = useState(initialCaption ?? "");
  const [imageUrl, setImageUrl] = useState<string | undefined>(initialImageUrl);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // People picker state
  const [showPicker, setShowPicker] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [search, setSearch] = useState("");
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorRef = useRef<number>(0);

  const authorName = displayName || user?.email || "User";

  useEffect(() => {
    if (open) {
      setCaption(initialCaption ?? "");
      setImageUrl(initialImageUrl);
      setTimeout(() => textareaRef.current?.focus(), 100);
    } else {
      setCaption("");
      setImageUrl(undefined);
      setShowPicker(false);
      setSearch("");
      setMentionedUserIds([]);
    }
  }, [open, initialCaption, initialImageUrl]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const openPicker = async () => {
    // Save cursor position before opening picker
    cursorRef.current = textareaRef.current?.selectionStart ?? caption.length;
    setShowPicker(true);
    if (users.length === 0) {
      setLoadingUsers(true);
      try {
        const all = await getAllUsers();
        setUsers(all.filter((u) => u.id !== user?.uid));
      } catch {
        toast({ title: t.common.error, description: t.timeline.create.loadUsersError, variant: "destructive" });
      } finally {
        setLoadingUsers(false);
      }
    }
  };

  const handleMention = (u: User) => {
    setMentionedUserIds((prev) => Array.from(new Set([...prev, u.id])));
    const mention = `@${u.displayName} `;
    const pos = cursorRef.current;
    const next = caption.slice(0, pos) + mention + caption.slice(pos);
    setCaption(next);
    setShowPicker(false);
    setSearch("");
    // Restore focus to textarea after a tick
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = pos + mention.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 50);
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploadingImage(true);
    try {
      const url = await uploadImageToCloudinary(file);
      setImageUrl(url);
    } catch {
      toast({ title: t.timeline.create.uploadFailed, description: t.timeline.create.uploadError, variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!caption.trim() && !imageUrl) return;
    setSubmitting(true);
    try {
      await onSubmit(caption.trim(), imageUrl, mentionedUserIds);
      onOpenChange(false);
    } catch {
      toast({ title: t.common.error, description: t.timeline.create.createError, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const canPost = (caption.trim().length > 0 || !!imageUrl) && !submitting && !uploadingImage;

  const filteredUsers = users.filter((u) =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b shrink-0">
        <button
          onClick={() => onOpenChange(false)}
          className="p-1 rounded-full hover:bg-accent transition-colors"
          disabled={submitting}
        >
          <X className="h-6 w-6" />
        </button>
        <span className="font-bold text-base">{title ?? t.timeline.create.title}</span>
        <button
          onClick={handleSubmit}
          disabled={!canPost}
          className={cn(
            "text-sm font-bold transition-colors",
            canPost ? "text-primary hover:text-primary/80" : "text-muted-foreground"
          )}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (submitLabel ?? t.timeline.create.post)}
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Author row */}
        <div className="flex items-center gap-3 px-4 py-4">
          <CachedAvatar
            src={photoURL}
            alt="Profile"
            fallback={authorName.charAt(0).toUpperCase()}
            className="h-12 w-12 shrink-0 ring-2 ring-[#e1b506]"
            fallbackClassName="bg-primary text-primary-foreground font-bold text-lg"
          />
          <span className="font-bold text-base">{authorName}</span>
        </div>

        {/* Chips */}
        <div className="px-4 pb-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-sm font-medium whitespace-nowrap shrink-0 hover:bg-accent transition-colors"
            >
              <ImagePlus className="h-4 w-4" />
              {t.timeline.create.photo}
            </button>
            <button
              onClick={openPicker}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-sm font-medium whitespace-nowrap shrink-0 hover:bg-accent transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              {t.timeline.create.people}
            </button>
          </div>
        </div>

        {/* Text area */}
        <div className="px-4">
          <textarea
            ref={textareaRef}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={t.timeline.create.placeholder}
            rows={5}
            className="w-full bg-transparent text-base placeholder:text-muted-foreground resize-none outline-none border-none focus:ring-0"
          />
        </div>

        {/* Workout summary card */}
        {workoutSummary && <WorkoutSummaryCard summary={workoutSummary} />}

        {/* Image preview */}
        {(imageUrl || uploadingImage) && (
          <div className="px-4 pb-4 mt-2">
            {uploadingImage ? (
              <div className="flex items-center justify-center h-48 rounded-2xl bg-muted">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : imageUrl ? (
              <div className="relative rounded-2xl overflow-hidden bg-muted flex items-center justify-center">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-full max-h-80 object-contain"
                />
                <button
                  onClick={() => setImageUrl(undefined)}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      {/* People picker overlay */}
      {showPicker && (
        <div className="absolute inset-0 z-10 bg-background flex flex-col">
          {/* Picker header */}
          <div className="flex items-center gap-3 px-4 h-14 border-b shrink-0">
            <button onClick={() => { setShowPicker(false); setSearch(""); }} className="p-1 rounded-full hover:bg-accent transition-colors">
              <X className="h-6 w-6" />
            </button>
            <span className="font-bold text-base flex-1">{t.timeline.create.tagPeople}</span>
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b shrink-0">
            <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                autoFocus
                placeholder={t.timeline.create.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                className="flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* User list */}
          <div className="flex-1 overflow-y-auto">
            {loadingUsers ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-12">{t.timeline.create.noUsers}</p>
            ) : (
              filteredUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleMention(u)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left"
                >
                  <CachedAvatar
                    src={u.photoURL}
                    alt={u.displayName}
                    fallback={u.displayName.charAt(0).toUpperCase()}
                    className="h-10 w-10 shrink-0 ring-2 ring-[#e1b506]"
                    fallbackClassName="bg-primary text-primary-foreground font-semibold"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{u.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
