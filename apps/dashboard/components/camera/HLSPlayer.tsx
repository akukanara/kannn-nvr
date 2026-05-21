'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Box, Spinner, Center, Text } from '@chakra-ui/react';

interface HLSPlayerProps {
  src: string;
  autoPlay?: boolean;
  muted?: boolean;
  className?: string;
  onError?: (error: Error) => void;
  onReady?: () => void;
  objectFit?: 'contain' | 'cover' | 'fill';
  enableLiveAI?: boolean;
}

// Global script loader helper
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') return resolve();
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
}

// Shared model references to prevent multiple downloads of model weights
let sharedCocoModel: any = null;
let sharedCocoModelPromise: Promise<any> | null = null;

const loadTF = async () => {
  if (typeof window === 'undefined') return;
  if (!(window as any).tf) {
    await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js');
  }
  if (!(window as any).cocoSsd) {
    await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js');
  }
};

export const getSharedCocoModel = async (onStatusChange?: (status: string) => void) => {
  if (sharedCocoModel) return sharedCocoModel;
  if (sharedCocoModelPromise) return sharedCocoModelPromise;

  sharedCocoModelPromise = (async () => {
    onStatusChange?.('Loading TF.js...');
    await loadTF();
    onStatusChange?.('Loading AI Model...');
    const cocoSsd = (window as any).cocoSsd;
    if (!cocoSsd) throw new Error('Coco-SSD failed to load from CDN');
    // Load MobileNetV2 which is super fast and perfect for browsers!
    const model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
    sharedCocoModel = model;
    return model;
  })();

  return sharedCocoModelPromise;
};

export function HLSPlayer({
  src,
  autoPlay = true,
  muted = true,
  className,
  onError,
  onReady,
  objectFit = 'cover',
  enableLiveAI = false
}: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [aiStatus, setAiStatus] = useState<string>('');
  const [modelLoaded, setModelLoaded] = useState(false);
  const retryCount = useRef(0);
  const maxRetries = 5;

  const isDetecting = useRef(false);
  const detectInterval = useRef<any>(null);

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

  useEffect(() => {
    if (!enableLiveAI) {
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
  }, [enableLiveAI]);

  return (
    <Box position="relative" w="100%" h="100%" overflow="hidden" bg="#000">
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
      
      {enableLiveAI && (
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: objectFit,
            pointerEvents: 'none',
            zIndex: 10
          }}
        />
      )}

      {enableLiveAI && aiStatus && (
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

