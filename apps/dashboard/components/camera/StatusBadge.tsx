'use client';

import { Box, Text } from '@chakra-ui/react';

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'processing' | 'warning';
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const colors = {
    online: 'status.online',
    offline: 'status.offline',
    processing: 'status.processing',
    warning: 'status.warning',
  };

  return (
    <Box display="flex" alignItems="center" gap={2}>
      <Box w={2} h={2} borderRadius="full" bg={colors[status]} />
      {label && (
        <Text fontSize="xs" color="fg.muted" textTransform="capitalize">
          {label}
        </Text>
      )}
    </Box>
  );
}
