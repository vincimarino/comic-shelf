'use client';
import Image from 'next/image';
import { useState } from 'react';

interface BookCoverProps {
  src: string | null;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
}

export default function BookCover({
  src, alt, width = 120, height = 180,
  className = '', style = {}, priority = false,
}: BookCoverProps) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div
        className={`cover-placeholder ${className}`}
        style={{ width, height, borderRadius: 4, ...style }}
      >
        <span style={{ fontSize: Math.max(9, width / 12) }}>{alt}</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={{ objectFit: 'cover', display: 'block', ...style }}
      onError={() => setError(true)}
      priority={priority}
      unoptimized={src.startsWith('http')}
    />
  );
}
