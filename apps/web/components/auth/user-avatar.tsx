"use client";

import { useEffect, useState } from "react";

interface UserAvatarProps {
  src?: string | null;
  name: string;
}

export function UserAvatar({ src, name }: UserAvatarProps) {
  const [showImage, setShowImage] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    if (!src) return;

    const timeout = window.setTimeout(() => {
      setShowImage(true);
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [src]);

  const initial = name.charAt(0).toUpperCase();

  if (!src || !showImage || imageFailed) {
    //Fallback: show the first letter of the user's name in a circle.
    return (
      <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium">
        {initial}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className="size-8 shrink-0 rounded-full object-cover"
      onError={() => setImageFailed(true)}
    />
  );
}