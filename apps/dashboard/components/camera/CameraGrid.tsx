'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Text, HStack, VStack } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { CameraCard } from './CameraCard';
import { HLSPlayer } from './HLSPlayer';
import { useFullscreen } from '@/hooks/useFullscreen';
import { fetchCameras } from '@/lib/api';
import type { CameraEntryClient } from '@/lib/types';

interface CameraLayout {
  colSpan: number;
  rowSpan: number;
  orderIndex: number;
}

export function CameraGrid() {
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(playerRef);

  // Canvas Layout States
  const [layoutConfigs, setLayoutConfigs] = useState<Record<string, CameraLayout>>({});
  const [selectedPreset, setSelectedPreset] = useState<string>('grid-3x3');
  const [gapSize, setGapSize] = useState<string>('12px');
  const [showGridLines, setShowGridLines] = useState<boolean>(true);

  const { data: cameras = [] } = useQuery({
    queryKey: ['cameras'],
    queryFn: fetchCameras,
    refetchInterval: 30000,
  });

  // Load layout configurations from localStorage on mount
  useEffect(() => {
    try {
      const savedLayouts = localStorage.getItem('nvr-live-layouts');
      const savedPreset = localStorage.getItem('nvr-live-preset');
      const savedGap = localStorage.getItem('nvr-live-gap');
      const savedGridLines = localStorage.getItem('nvr-live-gridlines');

      if (savedLayouts) setLayoutConfigs(JSON.parse(savedLayouts));
      if (savedPreset) setSelectedPreset(savedPreset);
      if (savedGap) setGapSize(savedGap);
      if (savedGridLines) setShowGridLines(JSON.parse(savedGridLines));
    } catch (e) {
      console.error('Failed to load canvas settings', e);
    }
  }, []);

  // Update layout and save to localStorage
  const updateLayoutConfigs = (newConfigs: Record<string, CameraLayout>) => {
    setLayoutConfigs(newConfigs);
    localStorage.setItem('nvr-live-layouts', JSON.stringify(newConfigs));
  };

  // Helper to fetch dimensions of a camera slot
  const getCameraLayout = (cameraKey: string, index: number): CameraLayout => {
    const config = layoutConfigs[cameraKey];
    if (config) {
      return {
        colSpan: config.colSpan ?? 4,
        rowSpan: config.rowSpan ?? 2,
        orderIndex: config.orderIndex ?? index,
      };
    }
    return {
      colSpan: 4,
      rowSpan: 2,
      orderIndex: index,
    };
  };

  // Dynamic slot dimensions helper based on preset and sorted index
  const getRenderDimensions = (cameraKey: string, sortedIndex: number) => {
    if (selectedPreset === 'grid-2x2') {
      return { colSpan: 6, rowSpan: 3 };
    }
    if (selectedPreset === 'grid-3x3') {
      return { colSpan: 4, rowSpan: 2 };
    }
    if (selectedPreset === 'highlight-1-5') {
      return {
        colSpan: sortedIndex === 0 ? 8 : 4,
        rowSpan: sortedIndex === 0 ? 4 : 2,
      };
    }
    if (selectedPreset === 'cinematic-dual') {
      return {
        colSpan: sortedIndex < 2 ? 6 : 4,
        rowSpan: sortedIndex < 2 ? 3 : 2,
      };
    }
    
    // Custom layout: get custom size from layoutConfigs
    const layout = getCameraLayout(cameraKey, sortedIndex);
    return {
      colSpan: layout.colSpan,
      rowSpan: layout.rowSpan,
    };
  };

  // Preset Layout Configuration Engine
  const applyPreset = useCallback((preset: string) => {
    setSelectedPreset(preset);
    localStorage.setItem('nvr-live-preset', preset);

    if (preset === 'custom') return;

    const newConfigs: Record<string, CameraLayout> = {};
    cameras.forEach((camera: CameraEntryClient, index: number) => {
      let colSpan = 4;
      let rowSpan = 2;

      if (preset === 'grid-2x2') {
        colSpan = 6;
        rowSpan = 3;
      } else if (preset === 'grid-3x3') {
        colSpan = 4;
        rowSpan = 2;
      } else if (preset === 'highlight-1-5') {
        if (index === 0) {
          colSpan = 8;
          rowSpan = 4;
        } else {
          colSpan = 4;
          rowSpan = 2;
        }
      } else if (preset === 'cinematic-dual') {
        if (index < 2) {
          colSpan = 6;
          rowSpan = 3;
        } else {
          colSpan = 4;
          rowSpan = 2;
        }
      }

      newConfigs[camera.key] = {
        colSpan,
        rowSpan,
        orderIndex: index,
      };
    });

    updateLayoutConfigs(newConfigs);
  }, [cameras]);

  // Generate default layout if none exists yet
  useEffect(() => {
    if (cameras.length > 0 && Object.keys(layoutConfigs).length === 0) {
      applyPreset('grid-3x3');
    }
  }, [cameras, layoutConfigs, applyPreset]);

  // Adjust card size on the grid canvas
  // Adjust card size on the grid canvas
  const handleResize = useCallback((cameraKey: string, widthChange: number, heightChange: number) => {
    const index = cameras.findIndex(c => c.key === cameraKey);
    if (index === -1) return;

    // Get current dimensions from the active preset
    const current = getCameraLayout(cameraKey, index);

    let colSpan = current.colSpan + widthChange;
    let rowSpan = current.rowSpan + heightChange;

    colSpan = Math.max(2, Math.min(12, colSpan));
    rowSpan = Math.max(1, Math.min(4, rowSpan));

    // Clone all current camera layouts from the active preset state
    const newConfigs: Record<string, CameraLayout> = {};
    cameras.forEach((camera: CameraEntryClient, idx: number) => {
      const lay = getCameraLayout(camera.key, idx);
      newConfigs[camera.key] = {
        ...lay,
        colSpan: camera.key === cameraKey ? colSpan : lay.colSpan,
        rowSpan: camera.key === cameraKey ? rowSpan : lay.rowSpan,
      };
    });

    setSelectedPreset('custom');
    localStorage.setItem('nvr-live-preset', 'custom');
    updateLayoutConfigs(newConfigs);
  }, [cameras, layoutConfigs]);

  // Swap camera positions on the grid canvas
  const handleMove = useCallback((cameraKey: string, direction: 'left' | 'right') => {
    const sorted = [...cameras].sort((a, b) => {
      const idxA = cameras.findIndex(c => c.key === a.key);
      const idxB = cameras.findIndex(c => c.key === b.key);
      const aVal = getCameraLayout(a.key, idxA).orderIndex;
      const bVal = getCameraLayout(b.key, idxB).orderIndex;
      return aVal - bVal;
    });

    const index = sorted.findIndex(c => c.key === cameraKey);
    if (index === -1) return;

    let swapIndex = -1;
    if (direction === 'left' && index > 0) {
      swapIndex = index - 1;
    } else if (direction === 'right' && index < sorted.length - 1) {
      swapIndex = index + 1;
    }

    if (swapIndex !== -1) {
      const currentCamera = sorted[index];
      const swapCamera = sorted[swapIndex];

      const idxCurrent = cameras.findIndex(c => c.key === currentCamera.key);
      const idxSwap = cameras.findIndex(c => c.key === swapCamera.key);

      const currentLayout = getCameraLayout(currentCamera.key, idxCurrent);
      const swapLayout = getCameraLayout(swapCamera.key, idxSwap);

      const tempOrder = currentLayout.orderIndex;
      const tempColSpan = currentLayout.colSpan;
      const tempRowSpan = currentLayout.rowSpan;

      // Clone current active layout placements
      const newConfigs: Record<string, CameraLayout> = {};
      cameras.forEach((camera: CameraEntryClient, idx: number) => {
        newConfigs[camera.key] = getCameraLayout(camera.key, idx);
      });

      newConfigs[currentCamera.key].orderIndex = swapLayout.orderIndex;
      newConfigs[currentCamera.key].colSpan = swapLayout.colSpan;
      newConfigs[currentCamera.key].rowSpan = swapLayout.rowSpan;

      newConfigs[swapCamera.key].orderIndex = tempOrder;
      newConfigs[swapCamera.key].colSpan = tempColSpan;
      newConfigs[swapCamera.key].rowSpan = tempRowSpan;

      setSelectedPreset('custom');
      localStorage.setItem('nvr-live-preset', 'custom');
      updateLayoutConfigs(newConfigs);
    }
  }, [cameras, layoutConfigs]);

  // Swap positions of two camera slots via Drag & Drop
  const handleSwap = useCallback((draggedKey: string, targetKey: string) => {
    const newConfigs: Record<string, CameraLayout> = {};
    cameras.forEach((camera: CameraEntryClient, idx: number) => {
      newConfigs[camera.key] = getCameraLayout(camera.key, idx);
    });

    const indexA = cameras.findIndex(c => c.key === draggedKey);
    const indexB = cameras.findIndex(c => c.key === targetKey);
    if (indexA === -1 || indexB === -1) return;

    const layoutA = getCameraLayout(draggedKey, indexA);
    const layoutB = getCameraLayout(targetKey, indexB);

    // Swap BOTH orderIndex AND dimensions (colSpan, rowSpan)
    const tempOrder = layoutA.orderIndex;
    const tempColSpan = layoutA.colSpan;
    const tempRowSpan = layoutA.rowSpan;

    newConfigs[draggedKey].orderIndex = layoutB.orderIndex;
    newConfigs[draggedKey].colSpan = layoutB.colSpan;
    newConfigs[draggedKey].rowSpan = layoutB.rowSpan;

    newConfigs[targetKey].orderIndex = tempOrder;
    newConfigs[targetKey].colSpan = tempColSpan;
    newConfigs[targetKey].rowSpan = tempRowSpan;

    updateLayoutConfigs(newConfigs);
  }, [cameras, layoutConfigs]);

  const handleCameraClick = useCallback((key: string) => {
    setSelectedCamera(key);
    setIsPlayerOpen(true);
  }, []);

  const handleClosePlayer = useCallback(() => {
    setIsPlayerOpen(false);
    setSelectedCamera(null);
  }, []);

  const selectedCameraData = cameras.find((c: CameraEntryClient) => c.key === selectedCamera);

  // Sort cameras chronologically based on ordering index
  const sortedCameras = [...cameras].sort((a, b) => {
    const idxA = cameras.findIndex(c => c.key === a.key);
    const idxB = cameras.findIndex(c => c.key === b.key);
    const layoutA = getCameraLayout(a.key, idxA);
    const layoutB = getCameraLayout(b.key, idxB);
    return layoutA.orderIndex - layoutB.orderIndex;
  });

  return (
    <Box position="relative">
      {/* Dynamic Grid Canvas Toolbar */}
      <HStack
        mb={6}
        justify="space-between"
        align="center"
        bg="bg.panel"
        border="1px solid"
        borderColor="border.default"
        borderRadius="xl"
        p={4}
        flexWrap="wrap"
        gap={4}
        boxShadow="sm"
      >
        <VStack align="flex-start" gap={0}>
          <Text fontSize="lg" fontWeight="semibold" color="fg.primary">
            Live Preview Canvas
          </Text>
          <Text fontSize="2xs" color="fg.muted">
            Atur tata letak pemantauan CCTV secara visual dan dinamis
          </Text>
        </VStack>

        <HStack gap={3} flexWrap="wrap">
          {/* Preset Buttons */}
          <HStack gap={1} p={1} bg="bg.elevated" borderRadius="lg" border="1px solid" borderColor="border.default">
            {[
              {
                id: 'grid-2x2',
                label: 'Grid 2x2',
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                  </svg>
                )
              },
              {
                id: 'grid-3x3',
                label: 'Grid 3x3',
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="4" height="4" />
                    <rect x="10" y="3" width="4" height="4" />
                    <rect x="17" y="3" width="4" height="4" />
                    <rect x="3" y="10" width="4" height="4" />
                    <rect x="10" y="10" width="4" height="4" />
                    <rect x="17" y="10" width="4" height="4" />
                    <rect x="3" y="17" width="4" height="4" />
                    <rect x="10" y="17" width="4" height="4" />
                    <rect x="17" y="17" width="4" height="4" />
                  </svg>
                )
              },
              {
                id: 'highlight-1-5',
                label: 'Highlight 1+5',
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="11" height="11" />
                    <rect x="17" y="3" width="4" height="4" />
                    <rect x="17" y="10" width="4" height="4" />
                    <rect x="3" y="17" width="4" height="4" />
                    <rect x="10" y="17" width="4" height="4" />
                    <rect x="17" y="17" width="4" height="4" />
                  </svg>
                )
              },
              {
                id: 'cinematic-dual',
                label: 'Cinematic Dual',
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="8" height="11" />
                    <rect x="13" y="3" width="8" height="11" />
                    <rect x="3" y="17" width="5" height="4" />
                    <rect x="9.5" y="17" width="5" height="4" />
                    <rect x="16" y="17" width="5" height="4" />
                  </svg>
                )
              },
              {
                id: 'custom',
                label: 'Kustom Canvas (Edit Manual)',
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                )
              },
            ].map((p) => {
              const isActive = selectedPreset === p.id;
              return (
                <Box
                  key={p.id}
                  as="button"
                  onClick={() => applyPreset(p.id)}
                  p={2.5}
                  borderRadius="md"
                  color={isActive ? 'fg.primary' : 'fg.muted'}
                  bg={isActive ? 'bg.panel' : 'transparent'}
                  border="1px solid"
                  borderColor={isActive ? 'border.hover' : 'transparent'}
                  _hover={{ color: 'fg.primary', bg: isActive ? 'bg.panel' : 'accent.hover' }}
                  cursor="pointer"
                  transition="all 0.15s"
                  title={p.label}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  {p.icon}
                </Box>
              );
            })}
          </HStack>

          {/* Padding / Gap Selector */}
          <HStack gap={1} p={1} bg="bg.elevated" borderRadius="lg" border="1px solid" borderColor="border.default">
            {[
              { size: '4px', label: 'Sempit' },
              { size: '12px', label: 'Sedang' },
              { size: '20px', label: 'Lebar' },
            ].map((g) => {
              const isActive = gapSize === g.size;
              return (
                <Box
                  key={g.size}
                  as="button"
                  onClick={() => {
                    setGapSize(g.size);
                    localStorage.setItem('nvr-live-gap', g.size);
                  }}
                  px={2.5}
                  py={1.5}
                  borderRadius="md"
                  fontSize="2xs"
                  fontWeight="bold"
                  color={isActive ? 'fg.primary' : 'fg.muted'}
                  bg={isActive ? 'bg.panel' : 'transparent'}
                  _hover={{ color: 'fg.primary' }}
                  cursor="pointer"
                  transition="all 0.15s"
                >
                  {g.label}
                </Box>
              );
            })}
          </HStack>

          {/* Show gridLines toggle button */}
          <Box
            as="button"
            onClick={() => {
              const newVal = !showGridLines;
              setShowGridLines(newVal);
              localStorage.setItem('nvr-live-gridlines', JSON.stringify(newVal));
            }}
            px={3}
            py={2}
            borderRadius="lg"
            fontSize="xs"
            fontWeight="bold"
            color={showGridLines ? 'teal.400' : 'fg.muted'}
            bg="bg.elevated"
            border="1px solid"
            borderColor={showGridLines ? 'teal.500' : 'border.default'}
            _hover={{ bg: 'accent.hover', color: showGridLines ? 'teal.400' : 'fg.primary' }}
            cursor="pointer"
            transition="all 0.15s"
            display="flex"
            alignItems="center"
            gap={2}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
              <line x1="15" y1="3" x2="15" y2="21"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="3" y1="15" x2="21" y2="15"/>
            </svg>
            Garis Bantu Grid
          </Box>

          {/* Reset button */}
          <Box
            as="button"
            onClick={() => {
              localStorage.removeItem('nvr-live-layouts');
              localStorage.removeItem('nvr-live-preset');
              localStorage.removeItem('nvr-live-gap');
              localStorage.removeItem('nvr-live-gridlines');
              setLayoutConfigs({});
              setSelectedPreset('grid-3x3');
              setGapSize('12px');
              setShowGridLines(true);
            }}
            px={3}
            py={2}
            borderRadius="lg"
            fontSize="xs"
            fontWeight="bold"
            color="red.400"
            bg="bg.elevated"
            border="1px solid"
            borderColor="border.default"
            _hover={{ bg: 'rgba(239, 68, 68, 0.08)', borderColor: 'red.500' }}
            cursor="pointer"
            transition="all 0.15s"
          >
            Atur Ulang Layout
          </Box>
        </HStack>
      </HStack>

      {/* Blueprint Grid Container */}
      <Box
        position="relative"
        p={showGridLines ? 3 : 0}
        borderRadius="xl"
        bg={showGridLines ? 'bg.panel' : 'transparent'}
        border={showGridLines ? '1px dashed' : 'none'}
        borderColor="border.default"
        minH="500px"
        transition="all 0.2s"
      >
        {showGridLines && (
          <Box
            position="absolute"
            inset={0}
            backgroundImage="radial-gradient(var(--chakra-colors-border-default, rgba(255,255,255,0.08)) 1.5px, transparent 1.5px)"
            backgroundSize="24px 24px"
            opacity={0.15}
            pointerEvents="none"
            zIndex={1}
            borderRadius="xl"
          />
        )}

        <Box
          position="relative"
          zIndex={5}
          display="grid"
          gridTemplateColumns={{ base: 'repeat(1, minmax(0, 1fr))', md: 'repeat(12, minmax(0, 1fr))' }}
          gridAutoRows={{ base: 'auto', md: '140px' }}
          gap={gapSize}
        >
          {sortedCameras.map((camera, index) => {
            const dims = getRenderDimensions(camera.key, index);
            return (
              <CameraCard
                key={camera.key}
                camera={camera}
                cameraKey={camera.key}
                isActive={selectedCamera === camera.key}
                onClick={handleCameraClick}
                colSpan={dims.colSpan}
                rowSpan={dims.rowSpan}
                onResize={handleResize}
                onMove={handleMove}
                isCustomMode={selectedPreset === 'custom'}
                onSwap={handleSwap}
              />
            );
          })}
        </Box>
      </Box>

      {/* Main Large HLS Player modal */}
      {isPlayerOpen && selectedCameraData && (
        <Box
          position="fixed"
          inset={0}
          bg="rgba(0,0,0,0.9)"
          zIndex={100}
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          p={4}
        >
          <Box
            ref={playerRef}
            w="full"
            maxW="1200px"
            aspectRatio="16/9"
            bg="black"
            borderRadius="lg"
            overflow="hidden"
            position="relative"
          >
            <HLSPlayer
              src={`/video/live/${selectedCamera}/stream.m3u8`}
              autoPlay
              muted={false}
              objectFit="contain"
              enableLiveAI
            />
          </Box>

          <HStack mt={4} gap={3}>
            <Box
              as="button"
              px={4}
              py={2}
              borderRadius="md"
              bg="accent.default"
              color="fg.primary"
              fontSize="sm"
              fontWeight="medium"
              _hover={{ bg: 'accent.hover' }}
              onClick={toggleFullscreen}
              cursor="pointer"
            >
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </Box>
            <Box
              as="button"
              px={4}
              py={2}
              borderRadius="md"
              bg="accent.default"
              color="fg.primary"
              fontSize="sm"
              fontWeight="medium"
              _hover={{ bg: 'accent.hover' }}
              onClick={handleClosePlayer}
              cursor="pointer"
            >
              Close
            </Box>
          </HStack>
        </Box>
      )}
    </Box>
  );
}
