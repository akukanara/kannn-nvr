'use client';

import { Box, Text, VStack, SimpleGrid } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { fetchStats } from '@/lib/api';

function StatCard({ label, value, subValue }: { label: string; value: string | number; subValue?: string }) {
  return (
    <Box
      p={5}
      borderRadius="lg"
      bg="bg.panel"
      border="1px solid"
      borderColor="border.default"
    >
      <Text fontSize="xs" color="fg.muted" textTransform="uppercase" letterSpacing="wide" mb={2}>
        {label}
      </Text>
      <Text fontSize="3xl" fontWeight="bold" color="fg.primary">
        {value}
      </Text>
      {subValue && (
        <Text fontSize="sm" color="fg.secondary" mt={1}>
          {subValue}
        </Text>
      )}
    </Box>
  );
}

export default function StatsPage() {
  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
    refetchInterval: 60000,
  });

  return (
    <Box>
      <Text fontSize="2xl" fontWeight="semibold" color="fg.primary" mb={6}>
        System Statistics
      </Text>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={4} mb={8}>
        <StatCard label="Total Movements" value={stats?.movements || 0} />
        <StatCard label="With Detections" value={stats?.movementsWithDetections || 0} />
        <StatCard label="Cameras" value={stats?.cameras || 0} />
        <StatCard label="Detection Rate" value={`${stats ? Math.round((stats.movementsWithDetections / Math.max(stats.movements, 1)) * 100) : 0}%`} />
      </SimpleGrid>

      <Box
        p={5}
        borderRadius="lg"
        bg="bg.panel"
        border="1px solid"
        borderColor="border.default"
      >
        <Text fontSize="sm" fontWeight="medium" color="fg.primary" mb={4}>
          Movements by Day
        </Text>
        {stats?.camerasByDay && Object.keys(stats.camerasByDay).length > 0 ? (
          <VStack gap={2} align="stretch">
            {Object.entries(stats.camerasByDay).map(([date, cameras]) => {
              const total = Object.values(cameras).reduce((a, b) => a + b, 0);
              return (
                <Box key={date} display="flex" justifyContent="space-between" alignItems="center" py={2}>
                  <Text fontSize="sm" color="fg.secondary">{date}</Text>
                  <Text fontSize="sm" fontWeight="medium" color="fg.primary">{total}</Text>
                </Box>
              );
            })}
          </VStack>
        ) : (
          <Text fontSize="sm" color="fg.muted">No data available</Text>
        )}
      </Box>
    </Box>
  );
}
