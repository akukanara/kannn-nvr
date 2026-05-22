'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Box, Text, VStack, HStack, Button, Input, Separator } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { fetchCameras, fetchRecordings, getPlaybackStreamUrl } from '@/lib/api';
import { PlaybackPlayer } from '@/components/playback/PlaybackPlayer';
import type { RecordingBlock, CameraEntry } from '@/lib/types';

// Utility to format duration elegantly
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}d`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}d` : `${mins}m`;
}

// Utility to format duration in Indonesian hours/minutes
function formatHoursMinutes(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours} jam ${minutes} menit`;
  }
  return `${minutes} menit`;
}

// Utility to format epoch ctime to detailed local time
function formatFullTime(ctimeMs: number): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    hour12: false
  }).format(new Date(ctimeMs));
}

// Utility to format day label beautifully in Indonesian
function formatDayLabel(dayStr: string): string {
  const [y, m, d] = dayStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

export default function PlaybackPage() {
  // Timeline Container Reference
  const timelineRef = useRef<HTMLDivElement>(null);

  // Selector States
  const [selectedCameraKey, setSelectedCameraKey] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [cameraSearchQuery, setCameraSearchQuery] = useState('');

  // Video Player Playback States
  const [activeBlock, setActiveBlock] = useState<RecordingBlock | null>(null);
  const [activePlayerSrc, setActivePlayerSrc] = useState<string | null>(null);
  const [videoCurrentTimeSec, setVideoCurrentTimeSec] = useState(0);
  const [activePlayStartAbsTime, setActivePlayStartAbsTime] = useState<number | null>(null);

  // Timeline Hover States
  const [isHovering, setIsHovering] = useState(false);
  const [hoveredPercent, setHoveredPercent] = useState(0);
  const [hoveredX, setHoveredX] = useState(0);

  // 1. Fetch Cameras
  const { data: cameras = [], isLoading: isCamerasLoading } = useQuery({
    queryKey: ['cameras'],
    queryFn: fetchCameras,
  });

  // 2. Fetch Recordings for Selected Camera
  const { data: recordings = [], isLoading: isRecordingsLoading } = useQuery({
    queryKey: ['recordings', selectedCameraKey],
    queryFn: () => fetchRecordings(selectedCameraKey!),
    enabled: !!selectedCameraKey,
  });

  // Selected camera details
  const selectedCamera = useMemo(() => {
    return cameras.find((c) => c.key === selectedCameraKey) || null;
  }, [cameras, selectedCameraKey]);

  // Filter and sort cameras list
  const filteredCameras = useMemo(() => {
    return cameras.filter((c) =>
      c.name.toLowerCase().includes(cameraSearchQuery.toLowerCase())
    );
  }, [cameras, cameraSearchQuery]);

  // Group recordings by day and count duration
  const daysWithRecordingsMap = useMemo(() => {
    const map: Record<string, { durationSec: number; blocksCount: number }> = {};
    for (const block of recordings) {
      const d = new Date(block.ctimeMs);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dayStr = `${y}-${m}-${day}`;
      if (!map[dayStr]) {
        map[dayStr] = { durationSec: 0, blocksCount: 0 };
      }
      map[dayStr].durationSec += block.seconds;
      map[dayStr].blocksCount += 1;
    }
    return map;
  }, [recordings]);

  // Sorted list of days that have recordings (newest first)
  const sortedDays = useMemo(() => {
    return Object.keys(daysWithRecordingsMap).sort().reverse();
  }, [daysWithRecordingsMap]);

  // Automatically select the newest recording day when selected camera changes
  useEffect(() => {
    if (sortedDays.length > 0 && !selectedDay) {
      setSelectedDay(sortedDays[0]);
    }
  }, [sortedDays, selectedDay]);

  // Recording blocks falling on the selected day (sorted chronologically ascending)
  const blocksOnSelectedDay = useMemo(() => {
    if (!selectedDay) return [];
    return recordings.filter((block) => {
      const d = new Date(block.ctimeMs);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}` === selectedDay;
    }).sort((a, b) => a.ctimeMs - b.ctimeMs);
  }, [recordings, selectedDay]);

  // Calculate epoch millisecond for the start of the selected day
  const startOfDayMs = useMemo(() => {
    if (!selectedDay) return 0;
    const [y, m, d] = selectedDay.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  }, [selectedDay]);

  // Playhead percent position on the 24h timeline
  const activePlayheadPercent = useMemo(() => {
    if (!selectedDay || !activePlayStartAbsTime) return null;
    
    const currentAbsTimeMs = activePlayStartAbsTime + videoCurrentTimeSec * 1000;
    const playheadOffsetMs = currentAbsTimeMs - startOfDayMs;
    
    const pct = (playheadOffsetMs / (24 * 60 * 60 * 1000)) * 100;
    if (pct < 0 || pct > 100) return null;
    return pct;
  }, [selectedDay, activePlayStartAbsTime, videoCurrentTimeSec, startOfDayMs]);

  // Format running clock of current playback position
  const currentAbsTimeMs = useMemo(() => {
    if (!activePlayStartAbsTime) return activeBlock?.ctimeMs || null;
    return activePlayStartAbsTime + videoCurrentTimeSec * 1000;
  }, [activePlayStartAbsTime, videoCurrentTimeSec, activeBlock]);

  const formattedCurrentTime = useMemo(() => {
    if (!currentAbsTimeMs) return '';
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(new Date(currentAbsTimeMs));
  }, [currentAbsTimeMs]);

  // Reset page playback states on camera switch
  const handleCameraSelect = (cameraKey: string) => {
    setSelectedCameraKey(cameraKey);
    setSelectedDay(null);
    setActiveBlock(null);
    setActivePlayerSrc(null);
    setVideoCurrentTimeSec(0);
    setActivePlayStartAbsTime(null);
  };

  // Play standard recording block at a specific second offset
  const playBlockAtOffset = (block: RecordingBlock, offsetSec: number) => {
    if (!selectedCameraKey) return;
    
    const remainingSec = Math.max(2, block.seconds - offsetSec);
    const startSeg = block.segmentStart + Math.floor(offsetSec / 2);
    const src = getPlaybackStreamUrl(selectedCameraKey, startSeg, remainingSec);
    
    setActivePlayerSrc(src);
    setActiveBlock(block);
    setActivePlayStartAbsTime(block.ctimeMs + offsetSec * 1000);
    setVideoCurrentTimeSec(0);
  };

  // Play next contiguous recording segment on video end
  const handleVideoEnded = () => {
    if (!activeBlock) return;
    const currentIndex = blocksOnSelectedDay.findIndex(b => b.ctimeMs === activeBlock.ctimeMs);
    if (currentIndex !== -1 && currentIndex + 1 < blocksOnSelectedDay.length) {
      const nextBlock = blocksOnSelectedDay[currentIndex + 1];
      playBlockAtOffset(nextBlock, 0);
    }
  };

  // Trigger file download using API
  const handleDownloadMp4 = (block: RecordingBlock) => {
    if (!selectedCamera) return;
    const qs = `preseq=${selectedCamera.segments_prior_to_movement || 0}&postseq=${selectedCamera.segments_post_movement || 0}`;
    window.open(`/mp4/${block.segmentStart}/${block.seconds}/${selectedCamera.key}?${qs}`, '_blank');
  };

  // Timeline Mouse Interactions
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setHoveredPercent(pct);
    setHoveredX(x);
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedDay || !selectedCameraKey || blocksOnSelectedDay.length === 0 || !timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPercent = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    
    // Seconds into the selected 24h day
    const clickedSecOfDay = (clickPercent / 100) * 24 * 60 * 60;
    const clickedEpochMs = startOfDayMs + clickedSecOfDay * 1000;
    
    // 1. Check if there's a recording block covering this time
    const coveringBlock = blocksOnSelectedDay.find((block) => {
      const bStart = block.ctimeMs;
      const bEnd = block.ctimeMs + block.seconds * 1000;
      return clickedEpochMs >= bStart && clickedEpochMs <= bEnd;
    });
    
    if (coveringBlock) {
      const offsetSec = Math.floor((clickedEpochMs - coveringBlock.ctimeMs) / 1000);
      playBlockAtOffset(coveringBlock, offsetSec);
    } else {
      // 2. Snap to the first block that starts after this time on the same day
      const nextBlock = blocksOnSelectedDay.find(b => b.ctimeMs > clickedEpochMs);
      if (nextBlock) {
        playBlockAtOffset(nextBlock, 0);
      } else {
        // 3. Snap to the last block starting before this time
        const prevBlock = [...blocksOnSelectedDay].reverse().find(b => b.ctimeMs < clickedEpochMs);
        if (prevBlock) {
          playBlockAtOffset(prevBlock, 0);
        }
      }
    }
  };

  // Hover time calculated in HH:MM:SS format
  const hoveredTimeLabel = useMemo(() => {
    const totalSecs = Math.floor((hoveredPercent / 100) * 24 * 60 * 60);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [hoveredPercent]);

  return (
    <Box minH="calc(100vh - 48px)" display="flex" flexDir={{ base: 'column', lg: 'row' }} gap={6} p={4}>
      {/* 1. LEFT COLUMN: Camera Selector Sidebar */}
      <Box
        w={{ base: 'full', lg: '280px' }}
        bg="bg.panel"
        border="1px solid"
        borderColor="border.default"
        borderRadius="xl"
        p={4}
        display="flex"
        flexDir="column"
        gap={4}
        h={{ lg: 'calc(100vh - 90px)' }}
        position={{ lg: 'sticky' }}
        top={{ lg: '70px' }}
      >
        <Box>
          <Text fontSize="md" fontWeight="bold" color="fg.primary" mb={1}>
            Daftar Kamera
          </Text>
          <Text fontSize="xs" color="fg.muted">
            Pilih kamera untuk memutar rekaman
          </Text>
        </Box>

        <Input
          placeholder="Cari kamera..."
          value={cameraSearchQuery}
          onChange={(e) => setCameraSearchQuery(e.target.value)}
          size="sm"
          bg="bg.elevated"
          borderColor="border.default"
          _hover={{ borderColor: 'border.hover' }}
        />

        <Separator borderColor="border.default" />

        <VStack align="stretch" gap={2} flex={1} overflowY="auto" pr={1}>
          {isCamerasLoading ? (
            <Text fontSize="sm" color="fg.muted" textAlign="center" py={4}>
              Memuat kamera...
            </Text>
          ) : filteredCameras.length === 0 ? (
            <Text fontSize="sm" color="fg.muted" textAlign="center" py={4}>
              Kamera tidak ditemukan
            </Text>
          ) : (
            filteredCameras.map((camera) => {
              const isActive = camera.key === selectedCameraKey;
              return (
                <Box
                  key={camera.key}
                  onClick={() => handleCameraSelect(camera.key)}
                  p={3}
                  borderRadius="lg"
                  cursor="pointer"
                  bg={isActive ? 'accent.default' : 'transparent'}
                  border="1px solid"
                  borderColor={isActive ? 'accent.hover' : 'transparent'}
                  _hover={{ bg: 'accent.hover' }}
                  transition="all 0.15s ease"
                >
                  <HStack justify="space-between">
                    <HStack gap={3}>
                      <Box
                        w={8}
                        h={8}
                        borderRadius="md"
                        bg="bg.elevated"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        color="fg.secondary"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                      </Box>
                      <VStack align="flex-start" gap={0}>
                        <Text fontSize="sm" fontWeight="semibold" color="fg.primary" lineClamp={1}>
                          {camera.name}
                        </Text>
                        <Text fontSize="2xs" color="fg.muted">
                          {camera.folder}
                        </Text>
                      </VStack>
                    </HStack>
                    <Box
                      w={2}
                      h={2}
                      borderRadius="full"
                      bg={camera.enable_streaming ? 'status.online' : 'fg.muted'}
                    />
                  </HStack>
                </Box>
              );
            })
          )}
        </VStack>
      </Box>

      {/* 2. CENTER PANEL: Player & Bottom Timeline */}
      <Box flex={1} display="flex" flexDir="column" gap={6}>
        {!selectedCamera ? (
          /* State A: No Camera Selected */
          <Box
            flex={1}
            display="flex"
            flexDir="column"
            alignItems="center"
            justifyContent="center"
            bg="bg.panel"
            border="1px solid"
            borderColor="border.default"
            borderRadius="xl"
            p={12}
            textAlign="center"
            minH="500px"
          >
            <Box
              w={16}
              h={16}
              borderRadius="full"
              bg="bg.elevated"
              display="flex"
              alignItems="center"
              justifyContent="center"
              color="fg.secondary"
              mb={4}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16 10 8" />
              </svg>
            </Box>
            <Text fontSize="xl" fontWeight="bold" color="fg.primary" mb={2}>
              Unified Playback Center
            </Text>
            <Text fontSize="sm" color="fg.muted" maxW="400px">
              Pilih kamera dari panel kiri untuk memutar rekaman video continuous terpadu.
            </Text>
          </Box>
        ) : (
          /* State B: Camera Selected */
          <VStack align="stretch" gap={6} flex={1}>
            {/* 2.1 Video Viewport */}
            <Box
              bg="bg.panel"
              border="1px solid"
              borderColor="border.default"
              borderRadius="xl"
              overflow="hidden"
              boxShadow="lg"
            >
              {activePlayerSrc ? (
                <VStack align="stretch" gap={0}>
                  <Box position="relative" aspectRatio="16/9" bg="black" w="full">
                    <PlaybackPlayer
                      src={activePlayerSrc}
                      autoPlay
                      enableLiveAIByDefault
                      onTimeUpdate={(t) => setVideoCurrentTimeSec(t)}
                      onEnded={handleVideoEnded}
                    />
                  </Box>
                  
                  {/* Status Bar */}
                  <Box p={4} bg="bg.elevated" borderTop="1px solid" borderColor="border.default">
                    <HStack justify="space-between" flexWrap="wrap" gap={4}>
                      <VStack align="flex-start" gap={1}>
                        <HStack gap={2}>
                          <Text fontSize="sm" fontWeight="bold" color="fg.primary">
                            {selectedCamera.name}
                          </Text>
                          <Text fontSize="xs" px={2} py={0.5} borderRadius="md" bg="accent.default" color="fg.primary" fontWeight="medium">
                            Playback Aktif
                          </Text>
                        </HStack>
                        {formattedCurrentTime && (
                          <Text fontSize="xs" color="fg.secondary">
                            Waktu Rekaman: <Text as="span" fontWeight="semibold" color="yellow.400">{formattedCurrentTime}</Text>
                          </Text>
                        )}
                      </VStack>

                      <HStack gap={2}>
                        {activeBlock && (
                          <Button
                            size="sm"
                            variant="outline"
                            borderColor="border.default"
                            color="fg.primary"
                            _hover={{ bg: 'accent.hover' }}
                            onClick={() => handleDownloadMp4(activeBlock)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Unduh MP4
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          color="fg.muted"
                          _hover={{ bg: 'accent.hover', color: 'fg.primary' }}
                          onClick={() => {
                            setActivePlayerSrc(null);
                            setActiveBlock(null);
                            setActivePlayStartAbsTime(null);
                            setVideoCurrentTimeSec(0);
                          }}
                        >
                          Tutup Player
                        </Button>
                      </HStack>
                    </HStack>
                  </Box>
                </VStack>
              ) : (
                <Box
                  aspectRatio="16/9"
                  bg="black"
                  display="flex"
                  flexDir="column"
                  alignItems="center"
                  justifyContent="center"
                  p={6}
                  textAlign="center"
                >
                  <Box
                    w={12}
                    h={12}
                    borderRadius="full"
                    bg="bg.panel"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    color="fg.secondary"
                    mb={3}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                      <line x1="7" y1="2" x2="7" y2="22" />
                      <line x1="17" y1="2" x2="17" y2="22" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                    </svg>
                  </Box>
                  <Text fontSize="md" fontWeight="bold" color="fg.primary" mb={1}>
                    Belum Ada Posisi Dipilih
                  </Text>
                  <Text fontSize="xs" color="fg.muted" maxW="350px">
                    Silakan klik pada area baris linimasa (timeline) biru di bawah untuk langsung memutar rekaman dari jam tersebut.
                  </Text>
                </Box>
              )}
            </Box>

            {/* 2.2 Continuous 24-Hour Timeline */}
            <Box
              bg="bg.panel"
              border="1px solid"
              borderColor="border.default"
              borderRadius="xl"
              p={5}
              display="flex"
              flexDir="column"
              gap={4}
              boxShadow="sm"
            >
              <HStack justify="space-between">
                <VStack align="flex-start" gap={0}>
                  <Text fontSize="md" fontWeight="bold" color="fg.primary">
                    Linimasa Rekaman 24 Jam
                  </Text>
                  {selectedDay ? (
                    <Text fontSize="xs" color="fg.muted">
                      Menampilkan rekaman tanggal: <Text as="span" fontWeight="semibold" color="fg.primary">{formatDayLabel(selectedDay)}</Text>
                    </Text>
                  ) : (
                    <Text fontSize="xs" color="fg.muted">
                      Pilih tanggal di sebelah kanan untuk melihat linimasa
                    </Text>
                  )}
                </VStack>

                <HStack gap={4}>
                  {/* Legend Indicators */}
                  <HStack gap={1}>
                    <Box w={3} h={3} borderRadius="sm" bg="teal.500" />
                    <Text fontSize="2xs" color="fg.muted">Ada Rekaman</Text>
                  </HStack>
                  <HStack gap={1}>
                    <Box w={3} h={3} borderRadius="sm" bg="yellow.400" />
                    <Text fontSize="2xs" color="fg.muted">Playhead</Text>
                  </HStack>
                </HStack>
              </HStack>

              {/* The Timeline Scrubber Container */}
              <Box position="relative" my={2}>
                <Box
                  ref={timelineRef}
                  position="relative"
                  w="full"
                  h="44px"
                  bg="bg.elevated"
                  border="1px solid"
                  borderColor="border.default"
                  borderRadius="md"
                  overflow="hidden"
                  cursor="pointer"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  onClick={handleTimelineClick}
                  transition="border-color 0.2s"
                  _hover={{ borderColor: 'border.hover' }}
                >
                  {/* Hour markers grid overlay */}
                  {Array.from({ length: 24 }).map((_, i) => (
                    <Box
                      key={i}
                      position="absolute"
                      left={`${(i / 24) * 100}%`}
                      top={0}
                      bottom={0}
                      width="1px"
                      bg="border.default"
                      opacity={0.3}
                      pointerEvents="none"
                    />
                  ))}

                  {/* Render blue recording blocks */}
                  {selectedDay && blocksOnSelectedDay.map((block) => {
                    const startPercent = ((block.ctimeMs - startOfDayMs) / (24 * 60 * 60 * 1000)) * 100;
                    const widthPercent = ((block.seconds * 1000) / (24 * 60 * 60 * 1000)) * 100;
                    return (
                      <Box
                        key={block.ctimeMs}
                        position="absolute"
                        left={`${startPercent}%`}
                        width={`${widthPercent}%`}
                        height="100%"
                        bg="teal.500"
                        opacity={0.7}
                        _hover={{ opacity: 0.9 }}
                      />
                    );
                  })}

                  {/* Active Playhead Cursor (Yellow) */}
                  {activePlayheadPercent !== null && (
                    <Box
                      position="absolute"
                      left={`${activePlayheadPercent}%`}
                      top={0}
                      bottom={0}
                      width="2px"
                      bg="yellow.400"
                      zIndex={20}
                      pointerEvents="none"
                      _after={{
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: '-4px',
                        borderLeft: '5px solid transparent',
                        borderRight: '5px solid transparent',
                        borderTop: '6px solid var(--chakra-colors-yellow-400)',
                      }}
                    />
                  )}

                  {/* Hover position tooltip line */}
                  {isHovering && (
                    <Box
                      position="absolute"
                      left={`${hoveredPercent}%`}
                      top={0}
                      bottom={0}
                      width="1px"
                      borderLeft="1px dashed"
                      borderColor="fg.muted"
                      zIndex={15}
                      pointerEvents="none"
                    />
                  )}
                </Box>

                {/* Floating Tooltip displaying hovered time */}
                {isHovering && (
                  <Box
                    position="absolute"
                    left={`${hoveredX}px`}
                    bottom="52px"
                    transform="translateX(-50%)"
                    bg="bg.panel"
                    border="1px solid"
                    borderColor="border.default"
                    borderRadius="md"
                    px={2}
                    py={1}
                    boxShadow="md"
                    zIndex={30}
                    pointerEvents="none"
                  >
                    <Text fontSize="xs" fontWeight="semibold" color="fg.primary" whiteSpace="nowrap">
                      {hoveredTimeLabel}
                    </Text>
                  </Box>
                )}

                {/* Axis Scale Labels (HH:MM) */}
                <Box position="relative" w="full" h="20px" mt={2}>
                  {Array.from({ length: 13 }).map((_, i) => {
                    const hour = i * 2;
                    const pct = (hour / 24) * 100;
                    return (
                      <Box
                        key={hour}
                        position="absolute"
                        left={`${pct}%`}
                        transform="translateX(-50%)"
                        display="flex"
                        flexDir="column"
                        alignItems="center"
                      >
                        <Text fontSize="2xs" color="fg.muted" fontWeight="medium">
                          {String(hour).padStart(2, '0')}:00
                        </Text>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </Box>
          </VStack>
        )}
      </Box>

      {/* 3. RIGHT COLUMN: Calendar & Days with Footage */}
      {selectedCameraKey && (
        <Box
          w={{ base: 'full', lg: '300px' }}
          bg="bg.panel"
          border="1px solid"
          borderColor="border.default"
          borderRadius="xl"
          p={4}
          display="flex"
          flexDir="column"
          gap={4}
          h={{ lg: 'calc(100vh - 90px)' }}
          position={{ lg: 'sticky' }}
          top={{ lg: '70px' }}
        >
          <Box>
            <Text fontSize="md" fontWeight="bold" color="fg.primary" mb={1}>
              Kalender & Tanggal
            </Text>
            <Text fontSize="xs" color="fg.muted">
              Pilih tanggal rekaman dari opsi di bawah
            </Text>
          </Box>

          {/* HTML Date Input */}
          <Box>
            <Text fontSize="xs" fontWeight="semibold" color="fg.secondary" mb={1.5}>
              Pilih Tanggal Manual
            </Text>
            <Input
              type="date"
              value={selectedDay || ''}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDay(e.target.value);
                  setActivePlayerSrc(null);
                  setActiveBlock(null);
                  setActivePlayStartAbsTime(null);
                  setVideoCurrentTimeSec(0);
                }
              }}
              size="sm"
              bg="bg.elevated"
              borderColor="border.default"
              _hover={{ borderColor: 'border.hover' }}
            />
          </Box>

          <Separator borderColor="border.default" />

          {/* Quick list of days containing actual footages */}
          <Box flex={1} display="flex" flexDir="column" gap={2} overflow="hidden">
            <Text fontSize="xs" fontWeight="semibold" color="fg.secondary" mb={0.5}>
              Hari dengan Rekaman ({sortedDays.length})
            </Text>
            
            <VStack align="stretch" gap={2} flex={1} overflowY="auto" pr={1}>
              {isRecordingsLoading ? (
                <Text fontSize="xs" color="fg.muted" textAlign="center" py={4}>
                  Memindai rekaman...
                </Text>
              ) : sortedDays.length === 0 ? (
                <Text fontSize="xs" color="fg.muted" textAlign="center" py={4}>
                  Tidak ada rekaman terdeteksi
                </Text>
              ) : (
                sortedDays.map((dayStr) => {
                  const isActive = dayStr === selectedDay;
                  const dayMeta = daysWithRecordingsMap[dayStr];
                  return (
                    <Box
                      key={dayStr}
                      onClick={() => {
                        setSelectedDay(dayStr);
                        setActivePlayerSrc(null);
                        setActiveBlock(null);
                        setActivePlayStartAbsTime(null);
                        setVideoCurrentTimeSec(0);
                      }}
                      p={3}
                      borderRadius="lg"
                      cursor="pointer"
                      bg={isActive ? 'accent.default' : 'bg.elevated'}
                      border="1px solid"
                      borderColor={isActive ? 'accent.hover' : 'border.default'}
                      _hover={{ borderColor: 'accent.hover', bg: isActive ? 'accent.default' : 'bg.panel' }}
                      transition="all 0.15s ease"
                    >
                      <VStack align="stretch" gap={1}>
                        <HStack justify="space-between">
                          <Text fontSize="xs" fontWeight="bold" color="fg.primary">
                            {dayStr}
                          </Text>
                          {isActive && (
                            <Box w={1.5} h={1.5} borderRadius="full" bg="yellow.400" />
                          )}
                        </HStack>
                        <HStack justify="space-between">
                          <Text fontSize="2xs" color="fg.muted">
                            {formatHoursMinutes(dayMeta.durationSec)} footage
                          </Text>
                          <Text fontSize="2xs" color="fg.muted">
                            {dayMeta.blocksCount} klip
                          </Text>
                        </HStack>
                      </VStack>
                    </Box>
                  );
                })
              )}
            </VStack>
          </Box>
        </Box>
      )}
    </Box>
  );
}

