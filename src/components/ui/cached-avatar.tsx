/**
 * CachedAvatar — drop-in replacement for Avatar + AvatarImage + AvatarFallback
 * that skips the loading flash for images already seen this session.
 *
 * Module-level cache: survives re-renders and component unmounts.
 * Cleared only on full page reload.
 */
import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const loadedUrls = new Set<string>();

function preload(src: string) {
  if (loadedUrls.has(src)) return;
  const img = new Image();
  img.onload = () => loadedUrls.add(src);
  img.src = src;
}

interface CachedAvatarProps {
  src?: string | null;
  alt?: string;
  fallback: React.ReactNode;
  className?: string;
  fallbackClassName?: string;
  fallbackStyle?: React.CSSProperties;
  imgClassName?: string;
}

export function CachedAvatar({
  src,
  alt = "",
  fallback,
  className,
  fallbackClassName,
  fallbackStyle,
  imgClassName,
}: CachedAvatarProps) {
  const isCached = src ? loadedUrls.has(src) : false;
  const [ready, setReady] = React.useState(isCached);

  React.useEffect(() => {
    if (!src) return;
    if (loadedUrls.has(src)) {
      setReady(true);
      return;
    }
    setReady(false);
    const img = new Image();
    img.onload = () => {
      loadedUrls.add(src);
      setReady(true);
    };
    img.src = src;
  }, [src]);

  return (
    <Avatar className={className}>
      {src && ready && (
        <AvatarImage src={src} alt={alt} className={cn("object-cover", imgClassName)} />
      )}
      <AvatarFallback className={cn(fallbackClassName, ready && src ? "hidden" : "")} style={fallbackStyle}>
        {fallback}
      </AvatarFallback>
    </Avatar>
  );
}

/** Preload a list of URLs eagerly (e.g. on list render) */
export function preloadAvatars(urls: (string | null | undefined)[]) {
  urls.forEach((url) => url && preload(url));
}

interface CachedImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
}

/**
 * CachedImage — drop-in replacement for <img> that skips the loading flash
 * for images already seen this session. Shows nothing while loading.
 */
export function CachedImage({ src, alt = "", className }: CachedImageProps) {
  const isCached = src ? loadedUrls.has(src) : false;
  const [ready, setReady] = React.useState(isCached);

  React.useEffect(() => {
    if (!src) return;
    if (loadedUrls.has(src)) {
      setReady(true);
      return;
    }
    setReady(false);
    const img = new Image();
    img.onload = () => {
      loadedUrls.add(src);
      setReady(true);
    };
    img.src = src;
  }, [src]);

  if (!src || !ready) return null;
  return <img src={src} alt={alt} className={className} />;
}
