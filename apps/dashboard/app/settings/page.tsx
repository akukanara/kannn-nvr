'use client';

import { useState } from 'react';
import { Box, Text, VStack, HStack, Input, Button, Switch, Separator, SimpleGrid } from '@chakra-ui/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSettings, saveSettings } from '@/lib/api';
import type { Settings } from '@/lib/types';

interface ModelPreset {
  id: string;
  name: string;
  label: string;
  desc: string;
  model: string;
  targetHw: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
}

const PRESETS: ModelPreset[] = [
  { 
    id: 'onnx', 
    name: 'ONNX Runtime', 
    label: 'YOLO11n (ONNX)', 
    desc: 'Runs on CPU. Default for Windows, macOS, and standard Linux.', 
    model: 'model/yolo11n.onnx', 
    targetHw: '',
    badge: 'CPU Default',
    badgeBg: 'rgba(56, 189, 248, 0.15)',
    badgeColor: '#38bdf8'
  },
  { 
    id: 'rk3588', 
    name: 'RK3588 NPU', 
    label: 'YOLO11n (RK3588 NPU)', 
    desc: 'Hardware accelerated inference on Rockchip RK3588 NPU.', 
    model: 'model/yolo11n-rk3588.rknn', 
    targetHw: 'rk3588',
    badge: 'NPU Accelerated',
    badgeBg: 'rgba(74, 222, 128, 0.15)',
    badgeColor: '#4ade80'
  },
  { 
    id: 'rk3576', 
    name: 'RK3576 NPU', 
    label: 'YOLO11n (RK3576 NPU)', 
    desc: 'Hardware accelerated inference on Rockchip RK3576 NPU.', 
    model: 'model/yolo11n-rk3576.rknn', 
    targetHw: 'rk3576',
    badge: 'NPU Accelerated',
    badgeBg: 'rgba(74, 222, 128, 0.15)',
    badgeColor: '#4ade80'
  },
  { 
    id: 'stub', 
    name: 'Simulation Mode', 
    label: 'Stub (Simulation)', 
    desc: 'Simulated detections for testing without NPU/CPU overhead.', 
    model: 'stub', 
    targetHw: '',
    badge: 'Developer Mode',
    badgeBg: 'rgba(251, 191, 36, 0.15)',
    badgeColor: '#fbbf24'
  }
];

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
  });

  const [localSettings, setLocalSettings] = useState<Settings | null>(null);
  const [newTagInput, setNewTagInput] = useState('');
  const [saveStatus, setSaveStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const mutation = useMutation({
    mutationFn: saveSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSaveStatus({ success: true, message: 'Settings saved successfully!' });
      setTimeout(() => setSaveStatus(null), 4000);
    },
    onError: (err: any) => {
      setSaveStatus({ success: false, message: err.message || 'Failed to save settings' });
    }
  });

  if (isLoading || !settings) {
    return (
      <Box maxW="1200px" mx="auto" p={6}>
        <Text fontSize="2xl" fontWeight="bold" color="fg.primary" mb={6}>
          Settings
        </Text>
        <Text color="fg.muted">Loading configuration settings...</Text>
      </Box>
    );
  }

  const current = localSettings || {
    ...settings,
    detection_model: settings.detection_model || 'model/yolo11n.onnx',
    detection_frames_path: settings.detection_frames_path || 'ai'
  };

  const updateField = <K extends keyof Settings>(field: K, value: Settings[K]) => {
    setLocalSettings({ ...current, [field]: value });
  };

  const activePreset = PRESETS.find(p => p.model === current.detection_model && p.targetHw === current.detection_target_hw);
  const selectedPresetId = activePreset ? activePreset.id : (current.detection_model ? 'custom' : 'onnx');

  const handlePresetSelect = (presetId: string) => {
    if (presetId === 'custom') {
      setShowAdvanced(true);
      return;
    }
    const preset = PRESETS.find(p => p.id === presetId);
    if (preset) {
      setLocalSettings({
        ...current,
        detection_model: preset.model,
        detection_target_hw: preset.targetHw
      });
    }
  };

  const handleAddTagFilter = () => {
    const tag = newTagInput.trim().toLowerCase();
    if (!tag) return;
    const currentFilters = current.detection_tag_filters || [];
    if (!currentFilters.some(f => f.tag === tag)) {
      updateField('detection_tag_filters', [...currentFilters, { tag, minProbability: 0.5 }]);
    }
    setNewTagInput('');
  };

  return (
    <Box maxW="1200px" mx="auto" py={6} px={4}>
      {/* Title & Header */}
      <HStack mb={8} justify="space-between" align="flex-start" borderBottom="1px solid" borderColor="border.default" pb={4}>
        <VStack align="flex-start" gap={1}>
          <Text fontSize="3xl" fontWeight="extrabold" color="fg.primary" letterSpacing="tight">
            System Settings
          </Text>
          <Text fontSize="sm" color="fg.muted">
            Configure disk base storage paths, visual presets, NPU acceleration, and ML object filters.
          </Text>
        </VStack>

        <HStack gap={4} align="center" mt={2}>
          {saveStatus && (
            <Box
              px={3}
              py={1.5}
              borderRadius="md"
              bg={saveStatus.success ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)'}
              border="1px solid"
              borderColor={saveStatus.success ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)'}
            >
              <Text
                fontSize="xs"
                fontWeight="semibold"
                color={saveStatus.success ? '#4CAF50' : '#F44336'}
              >
                {saveStatus.message}
              </Text>
            </Box>
          )}
          <Button
            onClick={() => mutation.mutate(current)}
            loading={mutation.isPending}
            bg="accent.default"
            color="white"
            px={6}
            py={2.5}
            borderRadius="md"
            fontWeight="bold"
            boxShadow="sm"
            _hover={{ bg: 'accent.hover' }}
            cursor="pointer"
          >
            Save Settings
          </Button>
        </HStack>
      </HStack>

      {/* Grid Layout splits page beautifully */}
      <SimpleGrid columns={{ base: 1, lg: 12 }} gap={8}>
        {/* Left Column: Storage & System - 5 Columns */}
        <Box gridColumn={{ lg: 'span 5' }}>
          <VStack gap={6} align="stretch">
            {/* Storage Card */}
            <Box
              p={6}
              borderRadius="xl"
              bg="bg.panel"
              border="1px solid"
              borderColor="border.default"
              boxShadow="sm"
            >
              <HStack mb={4} gap={3}>
                <Box color="accent.default" p={1.5} bg="rgba(79, 70, 229, 0.1)" borderRadius="md">
                  {/* Disk Icon */}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
                    <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
                    <line x1="6" y1="6" x2="6.01" y2="6"/>
                    <line x1="6" y1="18" x2="6.01" y2="18"/>
                  </svg>
                </Box>
                <Text fontSize="lg" fontWeight="bold" color="fg.primary">
                  Storage Management
                </Text>
              </HStack>

              <VStack gap={5} align="stretch">
                <Box>
                  <Text fontSize="xs" fontWeight="semibold" color="fg.muted" mb={1.5}>
                    Base Directory Path
                  </Text>
                  <Input
                    value={current.disk_base_dir}
                    placeholder="e.g. C:\recordings or /recordings"
                    onChange={(e) => updateField('disk_base_dir', e.target.value)}
                    bg="bg.elevated"
                    borderColor="border.default"
                    borderRadius="md"
                    _hover={{ borderColor: 'border.hover' }}
                    _focus={{ borderColor: 'accent.default', boxShadow: 'none' }}
                  />
                  <Text fontSize="xxs" color="fg.muted" mt={1}>
                    Absolute path where live recordings and movement databases are stored.
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="xs" fontWeight="semibold" color="fg.muted" mb={1.5}>
                    Cleanup Interval (hours)
                  </Text>
                  <Input
                    type="number"
                    value={current.disk_cleanup_interval}
                    onChange={(e) => updateField('disk_cleanup_interval', Number(e.target.value))}
                    bg="bg.elevated"
                    borderColor="border.default"
                    borderRadius="md"
                    _hover={{ borderColor: 'border.hover' }}
                    _focus={{ borderColor: 'accent.default', boxShadow: 'none' }}
                  />
                  <Text fontSize="xxs" color="fg.muted" mt={1}>
                    How often system scans disk and purges old recordings to free space.
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="xs" fontWeight="semibold" color="fg.muted" mb={1.5}>
                    Capacity Threshold (%)
                  </Text>
                  <Input
                    type="number"
                    value={current.disk_cleanup_capacity}
                    onChange={(e) => updateField('disk_cleanup_capacity', Number(e.target.value))}
                    bg="bg.elevated"
                    borderColor="border.default"
                    borderRadius="md"
                    _hover={{ borderColor: 'border.hover' }}
                    _focus={{ borderColor: 'accent.default', boxShadow: 'none' }}
                  />
                  <Text fontSize="xxs" color="fg.muted" mt={1}>
                    Start cleaning oldest footage when storage usage exceeds this percentage.
                  </Text>
                </Box>
              </VStack>
            </Box>

            {/* Quick Stats/Tip box */}
            <Box
              p={5}
              borderRadius="xl"
              bg="rgba(79, 70, 229, 0.03)"
              border="1px dashed"
              borderColor="rgba(79, 70, 229, 0.2)"
            >
              <Text fontSize="xs" fontWeight="bold" color="accent.default" mb={1}>
                💡 Premium NVR Integration Tip
              </Text>
              <Text fontSize="2xs" color="fg.muted" lineHeight="tall">
                If you use multiple cameras, make sure they are on separate subfolders inside the Base Directory to avoid segment conflicts.
              </Text>
            </Box>
          </VStack>
        </Box>

        {/* Right Column: Object Detection - 7 Columns */}
        <Box gridColumn={{ lg: 'span 7' }}>
          <Box
            p={6}
            borderRadius="xl"
            bg="bg.panel"
            border="1px solid"
            borderColor="border.default"
            boxShadow="sm"
            transition="all 0.2s"
          >
            {/* Enable Header Switch */}
            <HStack justify="space-between" pb={4} borderBottom="1px solid" borderColor="border.default" mb={5}>
              <HStack gap={3}>
                <Box color="accent.default" p={1.5} bg="rgba(79, 70, 229, 0.1)" borderRadius="md">
                  {/* Eye/Vision Icon */}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </Box>
                <VStack align="flex-start" gap={0}>
                  <Text fontSize="lg" fontWeight="bold" color="fg.primary">
                    AI Object Detection
                  </Text>
                  <Text fontSize="xxs" color="fg.muted">
                    Enable real-time YOLO movement tagging
                  </Text>
                </VStack>
              </HStack>

              <Switch.Root
                checked={current.detection_enable}
                onCheckedChange={(e) => updateField('detection_enable', e.checked)}
              >
                <Switch.HiddenInput />
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch.Root>
            </HStack>

            {/* Sub-settings main container */}
            <Box
              opacity={current.detection_enable ? 1 : 0.4}
              pointerEvents={current.detection_enable ? 'auto' : 'none'}
              transition="all 0.25s ease-in-out"
            >
              <VStack gap={6} align="stretch">
                {/* Visual Preset Cards Grid */}
                <Box>
                  <Text fontSize="sm" fontWeight="bold" color="fg.primary" mb={3}>
                    Choose AI Model & hardware preset
                  </Text>
                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                    {PRESETS.map((preset) => {
                      const isSelected = selectedPresetId === preset.id;
                      return (
                        <Box
                          key={preset.id}
                          onClick={() => handlePresetSelect(preset.id)}
                          p={4}
                          borderRadius="lg"
                          border="2px solid"
                          borderColor={isSelected ? 'accent.default' : 'border.default'}
                          bg={isSelected ? 'rgba(79, 70, 229, 0.05)' : 'bg.elevated'}
                          boxShadow={isSelected ? '0 0 12px rgba(79, 70, 229, 0.15)' : 'none'}
                          cursor="pointer"
                          _hover={{
                            bg: isSelected ? 'rgba(79, 70, 229, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                            borderColor: isSelected ? 'accent.default' : 'border.hover'
                          }}
                          transition="all 0.15s"
                          position="relative"
                        >
                          {/* Active Glowing Dot */}
                          {isSelected && (
                            <Box
                              position="absolute"
                              top="12px"
                              right="12px"
                              w="8px"
                              h="8px"
                              borderRadius="full"
                              bg="accent.default"
                              boxShadow="0 0 8px var(--chakra-colors-accent-default)"
                            />
                          )}

                          <Box
                            px={2}
                            py={0.5}
                            borderRadius="full"
                            bg={preset.badgeBg}
                            display="inline-block"
                            mb={2}
                          >
                            <Text fontSize="xxs" fontWeight="bold" color={preset.badgeColor} textTransform="uppercase">
                              {preset.badge}
                            </Text>
                          </Box>

                          <Text fontSize="sm" fontWeight="bold" color="fg.primary" mb={1}>
                            {preset.name}
                          </Text>
                          <Text fontSize="xxs" color="fg.secondary" lineHeight="short">
                            {preset.desc}
                          </Text>
                        </Box>
                      );
                    })}

                    {/* Custom Mode selector card */}
                    <Box
                      onClick={() => handlePresetSelect('custom')}
                      p={4}
                      borderRadius="lg"
                      border="2px solid"
                      borderColor={selectedPresetId === 'custom' ? 'accent.default' : 'border.default'}
                      bg={selectedPresetId === 'custom' ? 'rgba(79, 70, 229, 0.05)' : 'bg.elevated'}
                      boxShadow={selectedPresetId === 'custom' ? '0 0 12px rgba(79, 70, 229, 0.15)' : 'none'}
                      cursor="pointer"
                      _hover={{
                        bg: selectedPresetId === 'custom' ? 'rgba(79, 70, 229, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                        borderColor: selectedPresetId === 'custom' ? 'accent.default' : 'border.hover'
                      }}
                      transition="all 0.15s"
                      display="flex"
                      flexDirection="column"
                      justifyContent="center"
                    >
                      <HStack gap={2} mb={1}>
                        {/* Sliders/Gear Icon */}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="4" y1="21" x2="4" y2="14"/>
                          <line x1="4" y1="10" x2="4" y2="3"/>
                          <line x1="12" y1="21" x2="12" y2="12"/>
                          <line x1="12" y1="8" x2="12" y2="3"/>
                          <line x1="20" y1="21" x2="20" y2="16"/>
                          <line x1="20" y1="12" x2="20" y2="3"/>
                          <line x1="1" y1="14" x2="7" y2="14"/>
                          <line x1="9" y1="8" x2="15" y2="8"/>
                          <line x1="17" y1="16" x2="23" y2="16"/>
                        </svg>
                        <Text fontSize="sm" fontWeight="bold" color="fg.primary">
                          Custom Model Paths
                        </Text>
                      </HStack>
                      <Text fontSize="xxs" color="fg.secondary">
                        Configure custom model weights and specify manual acceleration parameters.
                      </Text>
                    </Box>
                  </SimpleGrid>
                </Box>

                {/* Custom Model Path / Advanced overrides form */}
                {(selectedPresetId === 'custom' || showAdvanced) && (
                  <Box
                    p={4}
                    borderRadius="lg"
                    bg="rgba(255, 255, 255, 0.01)"
                    border="1px solid"
                    borderColor="border.default"
                    style={{ animation: 'slideDown 0.25s ease-out' }}
                  >
                    <HStack justify="space-between" mb={3}>
                      <Text fontSize="xs" fontWeight="bold" color="accent.default">
                        Advanced Model Config
                      </Text>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => setShowAdvanced(false)}
                        color="fg.muted"
                        _hover={{ color: 'fg.primary' }}
                      >
                        Hide
                      </Button>
                    </HStack>

                    <VStack gap={4} align="stretch">
                      <Box>
                        <Text fontSize="xxs" color="fg.muted" mb={1}>YOLO Weights Model Path</Text>
                        <Input
                          value={current.detection_model || ''}
                          onChange={(e) => updateField('detection_model', e.target.value)}
                          placeholder="e.g. model/yolo11n.onnx"
                          bg="bg.elevated"
                          borderColor="border.default"
                          size="sm"
                        />
                        <Text fontSize="3xs" color="fg.muted" mt={0.5}>
                          Relative path to server `./ai` directory.
                        </Text>
                      </Box>

                      <Box>
                        <Text fontSize="xxs" color="fg.muted" mb={1}>
                          Hardware Acceleration Target
                        </Text>
                        <select
                          value={current.detection_target_hw || ''}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateField('detection_target_hw', e.target.value)}
                          style={{
                            width: '100%',
                            height: '32px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--chakra-colors-bg-elevated)',
                            border: '1px solid var(--chakra-colors-border-default)',
                            color: 'var(--chakra-colors-fg-primary)',
                            padding: '0 8px',
                            outline: 'none',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          <option value="" style={{ backgroundColor: 'var(--chakra-colors-bg-panel)' }}>CPU / ONNX Runtime (default)</option>
                          <option value="rk3588" style={{ backgroundColor: 'var(--chakra-colors-bg-panel)' }}>RK3588 NPU (NPU acceleration)</option>
                          <option value="rk3576" style={{ backgroundColor: 'var(--chakra-colors-bg-panel)' }}>RK3576 NPU (NPU acceleration)</option>
                        </select>
                      </Box>
                    </VStack>
                  </Box>
                )}

                {/* Frames Output Path */}
                <Box>
                  <Text fontSize="sm" fontWeight="bold" color="fg.primary" mb={1.5}>
                    Snapshots Folder Name
                  </Text>
                  <Input
                    value={current.detection_frames_path || ''}
                    onChange={(e) => updateField('detection_frames_path', e.target.value)}
                    placeholder="e.g. frames"
                    bg="bg.elevated"
                    borderColor="border.default"
                    borderRadius="md"
                    _focus={{ borderColor: 'accent.default', boxShadow: 'none' }}
                  />
                  <Text fontSize="xxs" color="fg.muted" mt={1}>
                    Subfolder where snapshot images containing detected items are saved (relative to base directory).
                  </Text>
                </Box>

                {/* Tag Filters Confidence Manager */}
                <Box>
                  <Text fontSize="sm" fontWeight="bold" color="fg.primary" mb={1}>
                    Probability Confidence Filters
                  </Text>
                  <Text fontSize="xxs" color="fg.muted" mb={4}>
                    Tag detected movements in filtered feed only if they exceed these confidence thresholds.
                  </Text>

                  <VStack gap={3.5} align="stretch" mb={4}>
                    {((current.detection_tag_filters || []) as any[]).map((filter, idx) => (
                      <HStack
                        key={idx}
                        p={3.5}
                        borderRadius="xl"
                        bg="bg.elevated"
                        border="1px solid"
                        borderColor="border.default"
                        justify="space-between"
                        gap={4}
                        _hover={{ borderColor: 'accent.default' }}
                        transition="border-color 0.15s"
                      >
                        <HStack gap={4} flex={1}>
                          {/* Visual Tag Badge */}
                          <Box
                            px={3}
                            py={1}
                            borderRadius="md"
                            bg="accent.default"
                            color="white"
                            fontSize="xs"
                            fontWeight="bold"
                            textTransform="uppercase"
                            letterSpacing="wider"
                            minW="90px"
                            textAlign="center"
                            boxShadow="sm"
                          >
                            {filter.tag}
                          </Box>

                          <VStack align="stretch" gap={1.5} flex={1}>
                            <HStack justify="space-between">
                              <Text fontSize="2xs" color="fg.secondary">Min Probability Threshold</Text>
                              <Text fontSize="xs" fontWeight="extrabold" color="accent.default">
                                &ge;{Math.round((filter.minProbability || 0) * 100)}%
                              </Text>
                            </HStack>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={filter.minProbability || 0.5}
                              disabled={!current.detection_enable}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const val = parseFloat(e.target.value);
                                const newFilters = [...(current.detection_tag_filters || [])];
                                newFilters[idx] = { ...filter, minProbability: val };
                                updateField('detection_tag_filters', newFilters);
                              }}
                              style={{
                                width: '100%',
                                height: '6px',
                                borderRadius: '4px',
                                backgroundColor: 'var(--chakra-colors-bg-panel)',
                                accentColor: 'var(--chakra-colors-accent-default)',
                                cursor: 'pointer',
                                outline: 'none'
                              }}
                            />
                          </VStack>
                        </HStack>

                        <Button
                          size="xs"
                          variant="ghost"
                          color="fg.muted"
                          _hover={{ color: 'status.offline', bg: 'bg.panel' }}
                          disabled={!current.detection_enable}
                          onClick={() => {
                            const newFilters = (current.detection_tag_filters || []).filter((_, i) => i !== idx);
                            updateField('detection_tag_filters', newFilters);
                          }}
                          px={2}
                        >
                          Remove
                        </Button>
                      </HStack>
                    ))}

                    {(!current.detection_tag_filters || current.detection_tag_filters.length === 0) && (
                      <Box
                        py={8}
                        px={4}
                        textAlign="center"
                        border="1px dashed"
                        borderColor="border.default"
                        borderRadius="xl"
                        bg="bg.elevated"
                      >
                        <Text fontSize="xs" color="fg.muted" fontStyle="italic">
                          No visual object filters configured. Add tag filters below to start tracking targets.
                        </Text>
                      </Box>
                    )}
                  </VStack>

                  {/* Add New Tag Filter Form */}
                  <HStack gap={3}>
                    <Input
                      placeholder="e.g. person, car, dog, motor..."
                      value={newTagInput}
                      disabled={!current.detection_enable}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTagFilter();
                        }
                      }}
                      bg="bg.elevated"
                      borderColor="border.default"
                      borderRadius="md"
                      _focus={{ borderColor: 'accent.default', boxShadow: 'none' }}
                      size="sm"
                    />
                    <Button
                      size="sm"
                      bg="accent.default"
                      color="white"
                      disabled={!current.detection_enable || !newTagInput.trim()}
                      onClick={handleAddTagFilter}
                      _hover={{ bg: 'accent.hover' }}
                      px={5}
                      borderRadius="md"
                      fontWeight="bold"
                    >
                      Add Filter
                    </Button>
                  </HStack>
                </Box>
              </VStack>
            </Box>
          </Box>
        </Box>
      </SimpleGrid>
    </Box>
  );
}
