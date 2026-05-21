'use client';

import { useState, useCallback } from 'react';
import { Box, Text, VStack, HStack } from '@chakra-ui/react';
import { HLSPlayer } from './HLSPlayer';
import { StatusBadge } from './StatusBadge';
import type { CameraEntryClient } from '@/lib/types';

interface CameraCardProps {
  camera: CameraEntryClient;
  cameraKey: string;
  isActive: boolean;
  onClick: (key: string) => void;
  colSpan?: number;
  rowSpan?: number;
  onResize?: (key: string, widthChange: number, heightChange: number) => void;
  onMove?: (key: string, direction: 'left' | 'right') => void;
  isCustomMode?: boolean;
  onSwap?: (draggedKey: string, targetKey: string) => void;
}

export function CameraCard({
  camera,
  cameraKey,
  isActive,
  onClick,
  colSpan = 4,
  rowSpan = 2,
  onResize,
  onMove,
  isCustomMode = false,
  onSwap,
}: CameraCardProps) {
  const [hasError, setHasError] = useState(false);
  const [isDragTarget, setIsDragTarget] = useState(false);
  const [isLiveAIEnabled, setIsLiveAIEnabled] = useState(false);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  const streamUrl = `/video/live/${cameraKey}/stream.m3u8`;

  return (
    <Box
      role="group"
      position="relative"
      borderRadius="lg"
      overflow="hidden"
      bg="bg.panel"
      border="1px solid"
      borderColor={isDragTarget ? 'teal.400' : (isActive ? 'accent.hover' : 'border.default')}
      cursor="grab"
      _active={{ cursor: 'grabbing' }}
      transition="all 0.2s ease"
      _hover={isDragTarget ? {} : {
        borderColor: 'border.hover',
        transform: 'translateY(-1px)',
        boxShadow: 'md',
      }}
      transform={isDragTarget ? 'scale(0.98)' : undefined}
      boxShadow={isDragTarget ? '0 0 12px var(--chakra-colors-teal-500)' : undefined}
      onClick={() => onClick(cameraKey)}
      gridColumn={{ base: 'span 1', md: `span ${colSpan}` }}
      gridRow={{ base: 'span 1', md: `span ${rowSpan}` }}
      height="100%"
      minHeight={{ base: 'auto', md: '140px' }}
      aspectRatio={{ base: '16/9', md: undefined }}
      draggable={true}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', cameraKey);
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        setIsDragTarget(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDragLeave={() => {
        setIsDragTarget(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragTarget(false);
        const draggedKey = e.dataTransfer.getData('text/plain');
        if (draggedKey && draggedKey !== cameraKey) {
          onSwap?.(draggedKey, cameraKey);
        }
      }}
    >
      {/* Premium Hover Overlay Controls */}
      {isCustomMode && (
        <Box
          position="absolute"
          top={2}
          left={2}
          right={2}
          zIndex={30}
          bg="rgba(15, 23, 42, 0.85)"
          backdropFilter="blur(8px)"
          borderRadius="md"
          border="1px solid rgba(255, 255, 255, 0.1)"
          py={1.5}
          px={2.5}
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          opacity={0}
          _groupHover={{ opacity: 1 }}
          transition="opacity 0.2s ease"
          onClick={(e) => e.stopPropagation()} // Prevent triggering HLS main modal click
        >
          <Text fontSize="2xs" fontWeight="bold" color="white" opacity={0.8}>
            {colSpan}x{rowSpan}
          </Text>

          <HStack gap={1}>
            <Box
              as="button"
              onClick={() => onResize?.(cameraKey, -1, 0)}
              title="Kurangi Lebar"
              w={6}
              h={6}
              borderRadius="sm"
              bg="rgba(255,255,255,0.1)"
              _hover={{ bg: 'rgba(255,255,255,0.2)' }}
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize="2xs"
              fontWeight="bold"
              color="white"
            >
              W-
            </Box>
            <Box
              as="button"
              onClick={() => onResize?.(cameraKey, 1, 0)}
              title="Tambah Lebar"
              w={6}
              h={6}
              borderRadius="sm"
              bg="rgba(255,255,255,0.1)"
              _hover={{ bg: 'rgba(255,255,255,0.2)' }}
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize="2xs"
              fontWeight="bold"
              color="white"
            >
              W+
            </Box>
            <Box
              as="button"
              onClick={() => onResize?.(cameraKey, 0, -1)}
              title="Kurangi Tinggi"
              w={6}
              h={6}
              borderRadius="sm"
              bg="rgba(255,255,255,0.1)"
              _hover={{ bg: 'rgba(255,255,255,0.2)' }}
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize="2xs"
              fontWeight="bold"
              color="white"
              ml={1}
            >
              H-
            </Box>
            <Box
              as="button"
              onClick={() => onResize?.(cameraKey, 0, 1)}
              title="Tambah Tinggi"
              w={6}
              h={6}
              borderRadius="sm"
              bg="rgba(255,255,255,0.1)"
              _hover={{ bg: 'rgba(255,255,255,0.2)' }}
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize="2xs"
              fontWeight="bold"
              color="white"
            >
              H+
            </Box>
          </HStack>

          <HStack gap={1}>
            <Box
              as="button"
              onClick={() => onMove?.(cameraKey, 'left')}
              title="Geser Kiri"
              w={6}
              h={6}
              borderRadius="sm"
              bg="rgba(255,255,255,0.1)"
              _hover={{ bg: 'rgba(255,255,255,0.2)' }}
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize="xs"
              color="white"
            >
              ◀
            </Box>
            <Box
              as="button"
              onClick={() => onMove?.(cameraKey, 'right')}
              title="Geser Kanan"
              w={6}
              h={6}
              borderRadius="sm"
              bg="rgba(255,255,255,0.1)"
              _hover={{ bg: 'rgba(255,255,255,0.2)' }}
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize="xs"
              color="white"
            >
              ▶
            </Box>
          </HStack>
        </Box>
      )}

      {camera.enable_streaming && !hasError ? (
        <HLSPlayer
          src={streamUrl}
          autoPlay
          muted
          onError={handleError}
          enableLiveAI={isLiveAIEnabled}
        />
      ) : (
        <Box
          position="absolute"
          inset={0}
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="bg.panel"
        >
          <VStack gap={2}>
            <Text fontSize="2xl" color="fg.muted">
              {camera.name.charAt(0).toUpperCase()}
            </Text>
            <Text fontSize="sm" color="fg.muted">
              {hasError ? 'Stream Error' : 'Offline'}
            </Text>
          </VStack>
        </Box>
      )}

      <Box
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        px={3}
        py={2}
        bg="linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        zIndex={20}
      >
        <HStack gap={3} maxW="70%">
          <Text fontSize="sm" fontWeight="medium" color="white" lineClamp={1}>
            {camera.name}
          </Text>
          {camera.enable_streaming && !hasError && (
            <Box
              as="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsLiveAIEnabled(!isLiveAIEnabled);
              }}
              px={2.5}
              py={0.5}
              borderRadius="full"
              fontSize="2xs"
              fontWeight="bold"
              bg={isLiveAIEnabled ? 'purple.600' : 'rgba(255,255,255,0.15)'}
              color="white"
              _hover={{ bg: isLiveAIEnabled ? 'purple.500' : 'rgba(255,255,255,0.25)' }}
              transition="all 0.15s ease"
              display="flex"
              alignItems="center"
              gap={1.5}
              border="1px solid"
              borderColor={isLiveAIEnabled ? 'purple.400' : 'rgba(255,255,255,0.1)'}
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
          )}
        </HStack>
        <StatusBadge
          status={camera.enable_streaming && !hasError ? 'online' : 'offline'}
        />
      </Box>
    </Box>
  );
}
