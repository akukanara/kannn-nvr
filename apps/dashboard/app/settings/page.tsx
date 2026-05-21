'use client';

import { useState } from 'react';
import { Box, Text, VStack, HStack, Input, Button, Switch, Separator } from '@chakra-ui/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSettings, saveSettings } from '@/lib/api';
import type { Settings } from '@/lib/types';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
  });

  const [localSettings, setLocalSettings] = useState<Settings | null>(null);

  const mutation = useMutation({
    mutationFn: saveSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  if (isLoading || !settings) {
    return (
      <Box>
        <Text fontSize="2xl" fontWeight="semibold" color="fg.primary" mb={6}>
          Settings
        </Text>
        <Text color="fg.muted">Loading...</Text>
      </Box>
    );
  }

  const current = localSettings || settings;

  const updateField = <K extends keyof Settings>(field: K, value: Settings[K]) => {
    setLocalSettings({ ...current, [field]: value });
  };

  return (
    <Box maxW="800px">
      <Text fontSize="2xl" fontWeight="semibold" color="fg.primary" mb={6}>
        Settings
      </Text>

      <VStack gap={6} align="stretch">
        <Box
          p={5}
          borderRadius="lg"
          bg="bg.panel"
          border="1px solid"
          borderColor="border.default"
        >
          <Text fontSize="sm" fontWeight="medium" color="fg.primary" mb={4}>
            Storage
          </Text>

          <VStack gap={4} align="stretch">
            <Box>
              <Text fontSize="xs" color="fg.muted" mb={1}>Base Directory</Text>
              <Input
                value={current.disk_base_dir}
                onChange={(e) => updateField('disk_base_dir', e.target.value)}
                bg="bg.elevated"
                borderColor="border.default"
                _hover={{ borderColor: 'border.hover' }}
              />
            </Box>

            <Box>
              <Text fontSize="xs" color="fg.muted" mb={1}>Cleanup Interval (hours)</Text>
              <Input
                type="number"
                value={current.disk_cleanup_interval}
                onChange={(e) => updateField('disk_cleanup_interval', Number(e.target.value))}
                bg="bg.elevated"
                borderColor="border.default"
                _hover={{ borderColor: 'border.hover' }}
              />
            </Box>

            <Box>
              <Text fontSize="xs" color="fg.muted" mb={1}>Capacity Threshold (%)</Text>
              <Input
                type="number"
                value={current.disk_cleanup_capacity}
                onChange={(e) => updateField('disk_cleanup_capacity', Number(e.target.value))}
                bg="bg.elevated"
                borderColor="border.default"
                _hover={{ borderColor: 'border.hover' }}
              />
            </Box>
          </VStack>
        </Box>

        <Box
          p={5}
          borderRadius="lg"
          bg="bg.panel"
          border="1px solid"
          borderColor="border.default"
        >
          <Text fontSize="sm" fontWeight="medium" color="fg.primary" mb={4}>
            Object Detection
          </Text>

          <VStack gap={4} align="stretch">
            <HStack justify="space-between">
              <Text fontSize="sm" color="fg.secondary">Enable Detection</Text>
              <Switch.Root
                checked={current.detection_enable}
                onCheckedChange={(e) => updateField('detection_enable', e.checked)}
              >
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch.Root>
            </HStack>

            <Box>
              <Text fontSize="xs" color="fg.muted" mb={1}>Model</Text>
              <Input
                value={current.detection_model}
                onChange={(e) => updateField('detection_model', e.target.value)}
                bg="bg.elevated"
                borderColor="border.default"
                _hover={{ borderColor: 'border.hover' }}
              />
            </Box>

            <Box>
              <Text fontSize="xs" color="fg.muted" mb={1}>Target Hardware</Text>
              <Input
                value={current.detection_target_hw}
                onChange={(e) => updateField('detection_target_hw', e.target.value)}
                bg="bg.elevated"
                borderColor="border.default"
                _hover={{ borderColor: 'border.hover' }}
              />
            </Box>

            <Box>
              <Text fontSize="xs" color="fg.muted" mb={1}>Tag Filters (comma-separated)</Text>
              <Input
                value={current.detection_tag_filters?.join(', ') || ''}
                onChange={(e) => updateField('detection_tag_filters', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                bg="bg.elevated"
                borderColor="border.default"
                _hover={{ borderColor: 'border.hover' }}
              />
            </Box>
          </VStack>
        </Box>

        <HStack justify="flex-end">
          <Button
            onClick={() => mutation.mutate(current)}
            loading={mutation.isPending}
            bg="accent.default"
            color="fg.primary"
            _hover={{ bg: 'accent.hover' }}
          >
            Save Settings
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}
