'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';

interface PlaybackPlayerProps {
  src: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  onError?: (error: Error) => void;
  onTimeUpdate?: (currentTimeSec: number) => void;
  onLoadedMetadata?: (durationSec: number) => void;
}

export function PlaybackPlayer({
  src,
  autoPlay = true,
  onEnded,
  onError,
  onTimeUpdate,
  onLoadedMetadata,
}: PlaybackPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  const onEndedRef = useRef(onEnded);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onEndedRef.current = onEnded;
    onErrorRef.current = onError;
  }, [onEnded, onError]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    destroyHls();

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.load();
      if (autoPlay) video.play().catch(() => {});
      const handleEnded = () => onEndedRef.current?.();
      video.addEventListener('ended', handleEnded);
      return () => {
        video.removeEventListener('ended', handleEnded);
      };
    }

    if (!Hls.isSupported()) {
      onErrorRef.current?.(new Error('HLS not supported'));
      return;
    }

    const hls = new Hls({
      maxBufferLength: 60,
      fragLoadingTimeOut: 30000,
      manifestLoadingTimeOut: 30000,
    });

    hlsRef.current = hls;

    hls.on(Hls.Events.MEDIA_ATTACHED, () => {
      hls.loadSource(src);
    });

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      if (autoPlay) video.play().catch(() => {});
    });

    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        onErrorRef.current?.(new Error(`Playback error: ${data.details}`));
      }
    });

    const handleEnded = () => onEndedRef.current?.();
    video.addEventListener('ended', handleEnded);

    hls.attachMedia(video);

    return () => {
      video.removeEventListener('ended', handleEnded);
      destroyHls();
    };
  }, [src, autoPlay, destroyHls]);

  return (
    <video
      ref={videoRef}
      controls
      playsInline
      onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget.currentTime)}
      onLoadedMetadata={(e) => onLoadedMetadata?.(e.currentTarget.duration)}
      style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' }}
    />
  );
}

