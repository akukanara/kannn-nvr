'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Box, Spinner, Center, Text } from '@chakra-ui/react';
import { getSharedCocoModel } from '../camera/HLSPlayer';

interface PlaybackPlayerProps {
  src: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  onError?: (error: Error) => void;
  onTimeUpdate?: (currentTimeSec: number) => void;
  onLoadedMetadata?: (durationSec: number) => void;
  enableLiveAIByDefault?: boolean;
}

export function PlaybackPlayer({
  src,
  autoPlay = true,
  onEnded,
  onError,
  onTimeUpdate,
  onLoadedMetadata,
  enableLiveAIByDefault = true,
}: PlaybackPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isLiveAIEnabled, setIsLiveAIEnabled] = useState(enableLiveAIByDefault);
  const [aiStatus, setAiStatus] = useState<string>('');
  const [modelLoaded, setModelLoaded] = useState(false);

  const isDetecting = useRef(false);
  const detectInterval = useRef<any>(null);

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

  // Live AI Object Detection Effect
  useEffect(() => {
    if (!isLiveAIEnabled) {
      if (detectInterval.current) {
        clearInterval(detectInterval.current);
        detectInterval.current = null;
      }
      setModelLoaded(false);
      setAiStatus('');
      // Clear canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    let active = true;

    const startAI = async () => {
      try {
        setAiStatus('Initializing TF.js...');
        const model = await getSharedCocoModel((status) => {
          if (active) setAiStatus(status);
        });
        if (!active) return;
        setModelLoaded(true);
        setAiStatus('');

        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        detectInterval.current = setInterval(async () => {
          if (!active || isDetecting.current || video.paused || video.ended) return;
          isDetecting.current = true;

          try {
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
            }

            if (canvas.width === 0 || canvas.height === 0) {
              isDetecting.current = false;
              return;
            }

            const predictions = await model.detect(video);
            if (!active) return;

            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);

              predictions.forEach((pred: any) => {
                const [x, y, width, height] = pred.bbox;
                const score = Math.round(pred.score * 100);

                // Elegant high-visibility neon purple border
                ctx.strokeStyle = '#a855f7'; // Purple Accent
                ctx.lineWidth = Math.max(3, video.videoWidth / 300);
                ctx.strokeRect(x, y, width, height);

                // Label badge
                const label = `${pred.class} ${score}%`;
                ctx.font = `bold ${Math.max(12, video.videoWidth / 55)}px sans-serif`;
                const textWidth = ctx.measureText(label).width;
                const textHeight = Math.max(16, video.videoWidth / 45);

                // Purple badge background
                ctx.fillStyle = '#a855f7';
                ctx.fillRect(x - 1, y - textHeight - 2, textWidth + 8, textHeight + 4);

                // White text
                ctx.fillStyle = '#ffffff';
                ctx.fillText(label, x + 3, y - 4);
              });
            }
          } catch (err) {
            console.error('AI frame detection error:', err);
          } finally {
            isDetecting.current = false;
          }
        }, 120); // ~8 FPS
      } catch (err: any) {
        console.error('Failed to initialize local AI detector:', err);
        if (active) setAiStatus('AI Error: ' + err.message);
      }
    };

    startAI();

    return () => {
      active = false;
      if (detectInterval.current) {
        clearInterval(detectInterval.current);
        detectInterval.current = null;
      }
    };
  }, [isLiveAIEnabled]);

  return (
    <Box position="relative" w="100%" h="100%" overflow="hidden" bg="#000">
      <video
        ref={videoRef}
        controls
        playsInline
        onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => onLoadedMetadata?.(e.currentTarget.duration)}
        style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' }}
      />

      {/* Floating Toggle Button */}
      <Box
        position="absolute"
        top={3}
        right={3}
        zIndex={20}
      >
        <Box
          as="button"
          onClick={() => setIsLiveAIEnabled(!isLiveAIEnabled)}
          px={3}
          py={1.5}
          borderRadius="full"
          fontSize="2xs"
          fontWeight="bold"
          bg={isLiveAIEnabled ? 'purple.600' : 'rgba(15, 23, 42, 0.75)'}
          backdropFilter="blur(8px)"
          color="white"
          _hover={{ bg: isLiveAIEnabled ? 'purple.500' : 'rgba(15, 23, 42, 0.9)' }}
          transition="all 0.15s ease"
          display="flex"
          alignItems="center"
          gap={1.5}
          border="1px solid"
          borderColor={isLiveAIEnabled ? 'purple.400' : 'rgba(255, 255, 255, 0.15)'}
        >
          <Box 
            w={1.5} 
            h={1.5} 
            borderRadius="full" 
            bg={isLiveAIEnabled ? 'purple.200' : 'gray.400'} 
            style={{
              animation: isLiveAIEnabled ? 'pulse 1.5s infinite alternate' : 'none'
            }}
          />
          Live AI
        </Box>
      </Box>

      {isLiveAIEnabled && (
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            pointerEvents: 'none',
            zIndex: 10
          }}
        />
      )}

      {isLiveAIEnabled && aiStatus && (
        <Center
          position="absolute"
          inset={0}
          bg="rgba(15, 23, 42, 0.75)"
          backdropFilter="blur(4px)"
          zIndex={15}
        >
          <Box textAlign="center">
            <Spinner size="lg" color="purple.500" mb={3} />
            <Text color="white" fontSize="xs" fontWeight="semibold">
              {aiStatus}
            </Text>
          </Box>
        </Center>
      )}
    </Box>
  );
}


