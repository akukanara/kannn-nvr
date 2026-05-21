'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';

interface HLSPlayerProps {
  src: string;
  autoPlay?: boolean;
  muted?: boolean;
  className?: string;
  onError?: (error: Error) => void;
  onReady?: () => void;
  objectFit?: 'contain' | 'cover' | 'fill';
}

export function HLSPlayer({
  src,
  autoPlay = true,
  muted = true,
  className,
  onError,
  onReady,
  objectFit = 'cover'
}: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isReady, setIsReady] = useState(false);
  const retryCount = useRef(0);
  const maxRetries = 5;

  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  const initHls = useCallback(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    destroyHls();

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.load();
      if (autoPlay) {
        video.play().catch(() => {});
      }
      setIsReady(true);
      onReady?.();
      return;
    }

    if (!Hls.isSupported()) {
      onError?.(new Error('HLS not supported'));
      return;
    }

    const hls = new Hls({
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
      liveSyncDurationCount: 3,
      fragLoadingTimeOut: 20000,
      manifestLoadingTimeOut: 20000,
      levelLoadingTimeOut: 20000,
    });

    hlsRef.current = hls;

    hls.on(Hls.Events.MEDIA_ATTACHED, () => {
      hls.loadSource(src);
    });

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      setIsReady(true);
      retryCount.current = 0;
      onReady?.();
      if (autoPlay) {
        video.play().catch(() => {});
      }
    });

    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            if (retryCount.current < maxRetries) {
              retryCount.current++;
              hls.startLoad();
            } else {
              onError?.(new Error(`HLS network error: ${data.details}`));
            }
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            hls.recoverMediaError();
            break;
          default:
            if (retryCount.current < maxRetries) {
              retryCount.current++;
              setTimeout(() => initHls(), 2000 * retryCount.current);
            } else {
              onError?.(new Error(`HLS fatal error: ${data.details}`));
            }
            break;
        }
      }
    });

    hls.attachMedia(video);
  }, [src, autoPlay, onError, onReady, destroyHls]);

  useEffect(() => {
    initHls();
    return () => {
      destroyHls();
    };
  }, [src, initHls, destroyHls]);

  return (
    <video
      ref={videoRef}
      className={className}
      muted={muted}
      playsInline
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: objectFit,
        backgroundColor: '#000'
      }}
    />
  );
}
