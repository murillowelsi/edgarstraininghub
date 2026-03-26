import { Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  photoURL?: string | null;
  initials: string;
  showCrown?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
};

export function UserAvatar({ photoURL, initials, showCrown = false, className, size = "md" }: UserAvatarProps) {
  return (
    <div className="relative inline-flex shrink-0">
      <Avatar className={cn(sizeMap[size], "ring-2 ring-[#e1b506]", className)}>
        {photoURL && <AvatarImage src={photoURL} alt="Profile" className="object-cover" />}
        <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      {showCrown && (
        <Crown
          className="absolute -top-2.5 -right-1 h-4 w-4 fill-yellow-400 text-yellow-500 drop-shadow-sm"
          strokeWidth={1.5}
        />
      )}
    </div>
  );
}
