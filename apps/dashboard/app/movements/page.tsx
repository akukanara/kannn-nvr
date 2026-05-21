'use client';

import { useState } from 'react';
import { Box, Text, SimpleGrid, VStack, HStack, Button } from '@chakra-ui/react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMovements, getImageUrl, getPlaybackStreamUrl } from '@/lib/api';
import { PlaybackPlayer } from '@/components/playback/PlaybackPlayer';
import { useSSE } from '@/hooks/useSSE';
import type { Movement, SSEEvent } from '@/lib/types';

function MovementCard({ movement, onClick }: { movement: Movement; onClick: () => void }) {
  const imageUrl = getImageUrl(movement.timestamp);

  return (
    <Box
      borderRadius="lg"
      overflow="hidden"
      bg="bg.panel"
      border="1px solid"
      borderColor="border.default"
      cursor="pointer"
      transition="all 0.2s ease"
      _hover={{ borderColor: 'border.hover', transform: 'translateY(-1px)' }}
      onClick={onClick}
    >
      <Box position="relative" aspectRatio="16/9" bg="bg.elevated">
        <img
          src={imageUrl}
          alt={`Movement ${movement.humanTime}`}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <Box
          position="absolute"
          top={2}
          right={2}
          px={2}
          py={1}
          borderRadius="md"
          bg="rgba(0,0,0,0.7)"
        >
          <Text fontSize="xs" color="white" fontWeight="medium">
            {movement.seconds}s
          </Text>
        </Box>
      </Box>

      <Box p={3}>
        <Text fontSize="sm" fontWeight="medium" color="fg.primary" lineClamp={1}>
          {movement.camera}
        </Text>
        <Text fontSize="xs" color="fg.muted" mt={1}>
          {movement.humanTime}
        </Text>
        {movement.detection && movement.detection.length > 0 && (
          <HStack mt={2} gap={1} flexWrap="wrap">
            {movement.detection.slice(0, 3).map((d, i) => (
              <Box
                key={i}
                px={2}
                py={0.5}
                borderRadius="sm"
                bg="accent.default"
                fontSize="xs"
                color="fg.secondary"
              >
                {d.tag}
              </Box>
            ))}
            {movement.detection.length > 3 && (
              <Text fontSize="xs" color="fg.muted">
                +{movement.detection.length - 3}
              </Text>
            )}
          </HStack>
        )}
      </Box>
    </Box>
  );
}

export default function MovementsPage() {
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);
  const queryClient = useQueryClient();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['movements'],
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      return fetchMovements('movement', 24, pageParam);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  });

  const handleSSE = (event: SSEEvent) => {
    if (event.type === 'movement_new' || event.type === 'movement_complete') {
      queryClient.invalidateQueries({ queryKey: ['movements'] });
    }
  };

  useSSE(handleSSE);

  const movements = data?.pages.flatMap((page) => page.items) || [];

  return (
    <Box>
      <Text fontSize="2xl" fontWeight="semibold" color="fg.primary" mb={6}>
        Movement Events
      </Text>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3, xl: 4 }} gap={4}>
        {movements.map((movement: Movement) => (
          <MovementCard
            key={movement.timestamp}
            movement={movement}
            onClick={() => setSelectedMovement(movement)}
          />
        ))}
      </SimpleGrid>

      {hasNextPage && (
        <Box mt={6} textAlign="center">
          <Button
            onClick={() => fetchNextPage()}
            loading={isFetchingNextPage}
            variant="outline"
            colorScheme="gray"
          >
            Load More
          </Button>
        </Box>
      )}

      {selectedMovement && (
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
            w="full"
            maxW="1000px"
            aspectRatio="16/9"
            bg="black"
            borderRadius="lg"
            overflow="hidden"
          >
            <PlaybackPlayer
              src={getPlaybackStreamUrl(
                selectedMovement.cameraKey,
                selectedMovement.startSegment,
                selectedMovement.seconds
              )}
              autoPlay
              onEnded={() => setSelectedMovement(null)}
            />
          </Box>

          <HStack mt={4} gap={4}>
            <Text fontSize="sm" color="fg.secondary">
              {selectedMovement.camera} — {selectedMovement.humanTime}
            </Text>
            <Button variant="outline" size="sm" onClick={() => setSelectedMovement(null)}>
              Close
            </Button>
          </HStack>
        </Box>
      )}
    </Box>
  );
}
