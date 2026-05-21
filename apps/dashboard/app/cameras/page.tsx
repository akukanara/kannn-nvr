'use client';

import { useState, useEffect } from 'react';
import { Box, Text, VStack, HStack, Input, Button, Switch, Separator, SimpleGrid } from '@chakra-ui/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCameras, saveCamera, deleteCamera, fetchSettings, probeONVIF } from '@/lib/api';
import type { CameraEntry } from '@/lib/types';

export default function CamerasPage() {
  const queryClient = useQueryClient();
  
  // Queries
  const { data: cameras = [], isLoading: isCamerasLoading } = useQuery({
    queryKey: ['cameras'],
    queryFn: fetchCameras,
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
  });

  // State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCameraKey, setEditingCameraKey] = useState<string | null>(null); // null = Add Mode, string = Edit Mode
  const [formValues, setFormValues] = useState<Partial<CameraEntry>>({});
  const [deleteConfirmKey, setDeleteConfirmKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [onvifUsername, setOnvifUsername] = useState('admin');
  const [isOnvifLoading, setIsOnvifLoading] = useState(false);
  const [onvifSuccessMsg, setOnvifSuccessMsg] = useState<string | null>(null);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: ({ id, camera }: { id: string; camera: Partial<CameraEntry> }) => saveCamera(id, camera),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
      setIsModalOpen(false);
      setEditingCameraKey(null);
      setFormValues({});
      setErrorMsg(null);
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || 'Failed to save camera');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, delopt }: { id: string; delopt: 'del' | 'delall' | 'reset' }) => deleteCamera(id, delopt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
      setDeleteConfirmKey(null);
    },
  });

  // Set default values when opening Add form
  useEffect(() => {
    if (isModalOpen && !editingCameraKey) {
      setFormValues({
        name: '',
        ip: '',
        passwd: '',
        disk: settings?.disk_base_dir || '/recordings',
        folder: '',
        streamSource: '',
        motionUrl: '',
        enable_streaming: true,
        enable_movement: true,
        pollsWithoutMovement: 2,
        secMaxSingleMovement: 60,
        mSPollFrequency: 1000,
        segments_prior_to_movement: 10,
        segments_post_movement: 10,
        secMovementStartupDelay: 10,
        ffmpegAudioCodec: 'copy',
      });
    }
  }, [isModalOpen, editingCameraKey, settings]);

  const handleOpenAdd = () => {
    setEditingCameraKey(null);
    setErrorMsg(null);
    setOnvifUsername('admin');
    setOnvifSuccessMsg(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (camera: CameraEntry) => {
    setEditingCameraKey(camera.key);
    setFormValues({ ...camera });
    setErrorMsg(null);
    setOnvifUsername('admin');
    setOnvifSuccessMsg(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormValues({});
    setErrorMsg(null);
    setOnvifUsername('admin');
    setOnvifSuccessMsg(null);
  };

  const handleOnvifProbe = async () => {
    if (!formValues.ip) return;
    setIsOnvifLoading(true);
    setOnvifSuccessMsg(null);
    setErrorMsg(null);

    try {
      const result = await probeONVIF(formValues.ip, onvifUsername || 'admin', formValues.passwd);
      
      setFormValues((prev) => ({
        ...prev,
        streamSource: result.streamUri,
      }));

      setOnvifSuccessMsg(`Success! Discovered RTSP URL on port ${result.port}: ${result.streamUri}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'ONVIF discovery failed. Please verify IP, credentials, or if ONVIF is enabled on the device.');
    } finally {
      setIsOnvifLoading(false);
    }
  };

  const handleInputChange = (field: keyof CameraEntry, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'enable_streaming' && value === false && { enable_movement: false }),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValues.name) {
      setErrorMsg('Camera Name is required');
      return;
    }
    if (!formValues.folder) {
      setErrorMsg('Storage Folder is required');
      return;
    }
    
    const id = editingCameraKey || 'new';
    saveMutation.mutate({ id, camera: formValues });
  };

  const handleDelete = (delopt: 'del' | 'delall' | 'reset') => {
    if (deleteConfirmKey) {
      deleteMutation.mutate({ id: deleteConfirmKey, delopt });
    }
  };

  if (isCamerasLoading) {
    return (
      <Box p={6}>
        <Text fontSize="2xl" fontWeight="semibold" color="fg.primary" mb={6}>
          Camera Management
        </Text>
        <Text color="fg.muted">Loading cameras...</Text>
      </Box>
    );
  }

  return (
    <Box p={6} position="relative" minH="100vh">
      {/* Header */}
      <HStack mb={6} justify="space-between" align="center">
        <VStack align="stretch" gap={1}>
          <Text fontSize="2xl" fontWeight="bold" color="fg.primary">
            Camera Management
          </Text>
          <Text fontSize="sm" color="fg.muted">
            Configure, edit, add, or remove IP cameras connected to your NVR system.
          </Text>
        </VStack>
        <Button
          onClick={handleOpenAdd}
          bg="accent.default"
          color="white"
          px={4}
          py={2.5}
          borderRadius="md"
          fontWeight="semibold"
          _hover={{ bg: 'accent.hover' }}
          cursor="pointer"
        >
          Add Camera
        </Button>
      </HStack>

      {/* Camera Grid/List */}
      {cameras.length === 0 ? (
        <Box
          p={10}
          textAlign="center"
          borderRadius="xl"
          bg="bg.panel"
          border="1px dashed"
          borderColor="border.default"
        >
          <Text color="fg.muted" mb={4}>No cameras added yet.</Text>
          <Button
            onClick={handleOpenAdd}
            bg="accent.default"
            color="white"
            px={4}
            py={2}
            borderRadius="md"
            _hover={{ bg: 'accent.hover' }}
            cursor="pointer"
          >
            Add your first camera
          </Button>
        </Box>
      ) : (
        <Box
          borderRadius="xl"
          overflow="hidden"
          bg="bg.panel"
          border="1px solid"
          borderColor="border.default"
        >
          <Box overflowX="auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--chakra-colors-border-default)', background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 'semibold', color: 'var(--chakra-colors-fg-muted)' }}>Camera Details</th>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 'semibold', color: 'var(--chakra-colors-fg-muted)' }}>IP / Source</th>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 'semibold', color: 'var(--chakra-colors-fg-muted)' }}>Storage Location</th>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 'semibold', color: 'var(--chakra-colors-fg-muted)' }}>Streaming</th>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 'semibold', color: 'var(--chakra-colors-fg-muted)' }}>Movement Detection</th>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 'semibold', color: 'var(--chakra-colors-fg-muted)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cameras.map((camera) => (
                  <tr
                    key={camera.key}
                    style={{
                      borderBottom: '1px solid var(--chakra-colors-border-default)',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.01)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '16px' }}>
                      <VStack align="flex-start" gap={0.5}>
                        <Text fontWeight="semibold" color="fg.primary">
                          {camera.name}
                        </Text>
                        <Text fontSize="xs" color="fg.muted">
                          Key: {camera.key}
                        </Text>
                      </VStack>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <Text fontSize="sm" color="fg.secondary">
                        {camera.streamSource || camera.ip || 'Not specified'}
                      </Text>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <Text fontSize="sm" color="fg.secondary">
                        {camera.disk}/{camera.folder}
                      </Text>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          background: camera.enable_streaming ? 'rgba(76, 175, 80, 0.15)' : 'rgba(244, 67, 54, 0.15)',
                          color: camera.enable_streaming ? '#4CAF50' : '#F44336',
                        }}
                      >
                        {camera.enable_streaming ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          background: camera.enable_movement ? 'rgba(76, 175, 80, 0.15)' : 'rgba(244, 67, 54, 0.15)',
                          color: camera.enable_movement ? '#4CAF50' : '#F44336',
                        }}
                      >
                        {camera.enable_movement ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <HStack justify="flex-end" gap={2}>
                        <Button
                          size="sm"
                          bg="rgba(255,255,255,0.05)"
                          color="fg.primary"
                          border="1px solid"
                          borderColor="border.default"
                          _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                          onClick={() => handleOpenEdit(camera)}
                          cursor="pointer"
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          bg="rgba(244, 67, 54, 0.1)"
                          color="#F44336"
                          border="1px solid rgba(244, 67, 54, 0.2)"
                          _hover={{ bg: 'rgba(244, 67, 54, 0.2)' }}
                          onClick={() => setDeleteConfirmKey(camera.key)}
                          cursor="pointer"
                        >
                          Remove
                        </Button>
                      </HStack>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </Box>
      )}

      {/* Add/Edit custom modal with slide-down glassmorphic dialog */}
      {isModalOpen && (
        <Box
          position="fixed"
          inset={0}
          bg="rgba(0,0,0,0.7)"
          backdropFilter="blur(5px)"
          zIndex={100}
          display="flex"
          alignItems="center"
          justifyContent="center"
          p={4}
          onClick={handleCloseModal}
        >
          <Box
            w="full"
            maxW="700px"
            maxH="90vh"
            bg="bg.panel"
            borderRadius="xl"
            border="1px solid"
            borderColor="border.default"
            p={6}
            boxShadow="2xl"
            display="flex"
            flexDirection="column"
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'slideDown 0.3s ease-out',
            }}
          >
            <Text fontSize="xl" fontWeight="bold" color="fg.primary" mb={4}>
              {editingCameraKey ? `Edit Camera Details (${editingCameraKey})` : 'Add New Camera'}
            </Text>
            
            <Separator mb={4} />

            <Box flex={1} overflowY="auto" pr={2} mb={6}>
              <form onSubmit={handleSubmit} id="camera-form">
                <VStack gap={5} align="stretch">
                  {/* General Config Section */}
                  <Text fontSize="xs" fontWeight="bold" color="accent.default" textTransform="uppercase" tracking-wider="true">
                    General Configuration
                  </Text>
                  
                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                    <Box>
                      <Text fontSize="xs" color="fg.muted" mb={1.5}>Camera Name *</Text>
                      <Input
                        required
                        placeholder="e.g. Front Door"
                        value={formValues.name || ''}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        bg="bg.elevated"
                        borderColor="border.default"
                        _hover={{ borderColor: 'border.hover' }}
                      />
                    </Box>
                    <Box>
                      <Text fontSize="xs" color="fg.muted" mb={1.5}>IP Address / Host</Text>
                      <Input
                        placeholder="e.g. 192.168.1.100"
                        value={formValues.ip || ''}
                        onChange={(e) => handleInputChange('ip', e.target.value)}
                        bg="bg.elevated"
                        borderColor="border.default"
                        _hover={{ borderColor: 'border.hover' }}
                      />
                    </Box>
                  </SimpleGrid>

                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                    <Box>
                      <Text fontSize="xs" color="fg.muted" mb={1.5}>Camera Password (only on create/update)</Text>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={formValues.passwd || ''}
                        onChange={(e) => handleInputChange('passwd', e.target.value)}
                        bg="bg.elevated"
                        borderColor="border.default"
                        _hover={{ borderColor: 'border.hover' }}
                      />
                    </Box>
                    <Box>
                      <Text fontSize="xs" color="fg.muted" mb={1.5}>Disk Base Directory</Text>
                      <Input
                        placeholder="e.g. /recordings"
                        value={formValues.disk || ''}
                        onChange={(e) => handleInputChange('disk', e.target.value)}
                        bg="bg.elevated"
                        borderColor="border.default"
                        _hover={{ borderColor: 'border.hover' }}
                      />
                    </Box>
                  </SimpleGrid>

                  {/* ONVIF Auto-Configuration */}
                  <Box bg="rgba(255,255,255,0.01)" p={4} borderRadius="lg" border="1px solid" borderColor="border.default">
                    <HStack justify="space-between" align="center" mb={2}>
                      <VStack align="flex-start" gap={0.5}>
                        <Text fontSize="xs" fontWeight="bold" color="accent.default">
                          ONVIF Autodiscovery
                        </Text>
                        <Text fontSize="xxs" color="fg.muted">
                          Automatically fetch the RTSP stream URL using camera's ONVIF protocol.
                        </Text>
                      </VStack>
                      <Button
                        type="button"
                        size="xs"
                        bg="accent.default"
                        color="white"
                        _hover={{ bg: 'accent.hover' }}
                        disabled={!formValues.ip}
                        onClick={handleOnvifProbe}
                        loading={isOnvifLoading}
                        cursor="pointer"
                      >
                        Fetch RTSP Stream
                      </Button>
                    </HStack>
                    <SimpleGrid columns={{ base: 1, md: 2 }} gap={4} mt={3}>
                      <Box>
                        <Text fontSize="xxs" color="fg.muted" mb={1}>ONVIF Username (defaults to 'admin')</Text>
                        <Input
                          placeholder="admin"
                          value={onvifUsername}
                          onChange={(e) => setOnvifUsername(e.target.value)}
                          bg="bg.elevated"
                          borderColor="border.default"
                          size="xs"
                        />
                      </Box>
                      <Box display="flex" alignItems="center">
                        <Text fontSize="xxs" color="fg.muted">
                          Requires <strong>IP Address</strong>. Fill the <strong>Password</strong> field above if ONVIF requires authentication.
                        </Text>
                      </Box>
                    </SimpleGrid>
                    {onvifSuccessMsg && (
                      <Box mt={3} p={2.5} borderRadius="md" bg="rgba(76, 175, 80, 0.1)" border="1px solid rgba(76, 175, 80, 0.2)">
                        <Text fontSize="xxs" color="#4CAF50" fontWeight="semibold">
                          {onvifSuccessMsg}
                        </Text>
                      </Box>
                    )}
                  </Box>

                  <Box>
                    <Text fontSize="xs" color="fg.muted" mb={1.5}>Storage Folder (relative to Disk Base Directory) *</Text>
                    <Input
                      required
                      placeholder="e.g. front_door"
                      value={formValues.folder || ''}
                      onChange={(e) => handleInputChange('folder', e.target.value)}
                      bg="bg.elevated"
                      borderColor="border.default"
                      _hover={{ borderColor: 'border.hover' }}
                    />
                  </Box>

                  <Separator />

                  {/* Advanced Stream Section */}
                  <Text fontSize="xs" fontWeight="bold" color="accent.default" textTransform="uppercase" tracking-wider="true">
                    Advanced Stream & Motion overrides
                  </Text>

                  <Box>
                    <Text fontSize="xs" color="fg.muted" mb={1}>Custom ffmpeg Stream Source URL (optional)</Text>
                    <Text fontSize="xxs" color="fg.muted" mb={1.5}>e.g. rtsp://user:pass@ip:554/stream or /path/to/local/file.mp4</Text>
                    <Input
                      placeholder="Overrides default constructed RTSP stream"
                      value={formValues.streamSource || ''}
                      onChange={(e) => handleInputChange('streamSource', e.target.value)}
                      bg="bg.elevated"
                      borderColor="border.default"
                      _hover={{ borderColor: 'border.hover' }}
                    />
                  </Box>

                  <Box>
                    <Text fontSize="xs" color="fg.muted" mb={1}>Custom Motion Detection API URL (optional)</Text>
                    <Text fontSize="xxs" color="fg.muted" mb={1.5}>e.g. http://ip/api/motion</Text>
                    <Input
                      placeholder="Overrides constructed motion URL"
                      value={formValues.motionUrl || ''}
                      onChange={(e) => handleInputChange('motionUrl', e.target.value)}
                      bg="bg.elevated"
                      borderColor="border.default"
                      _hover={{ borderColor: 'border.hover' }}
                    />
                  </Box>

                  <Separator />

                  {/* Playback & Movement Controls */}
                  <Text fontSize="xs" fontWeight="bold" color="accent.default" textTransform="uppercase" tracking-wider="true">
                    Streaming & Movement Settings
                  </Text>

                  <HStack justify="space-between" bg="rgba(255,255,255,0.01)" p={3} borderRadius="md" border="1px solid" borderColor="border.default">
                    <VStack align="flex-start" gap={0.5}>
                      <Text fontSize="sm" fontWeight="medium" color="fg.primary">Enable RTSP Streaming</Text>
                      <Text fontSize="xxs" color="fg.muted">Let ffmpeg pull stream and generate live m3u8 files</Text>
                    </VStack>
                    <Switch.Root
                      checked={formValues.enable_streaming || false}
                      onCheckedChange={(e) => handleInputChange('enable_streaming', e.checked)}
                    >
                      <Switch.HiddenInput />
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                    </Switch.Root>
                  </HStack>

                  {formValues.enable_streaming && (
                    <Box bg="rgba(255,255,255,0.01)" p={3} borderRadius="md" border="1px solid" borderColor="border.default">
                      <VStack align="stretch" gap={1.5}>
                        <Text fontSize="sm" fontWeight="medium" color="fg.primary">FFmpeg Audio Codec</Text>
                        <Text fontSize="xxs" color="fg.muted">
                          Choose how audio is handled in the stream. If you experience "AAC bitstream not in ADTS format" errors, select Transcode to AAC.
                        </Text>
                        <select
                          value={formValues.ffmpegAudioCodec || 'copy'}
                          onChange={(e) => handleInputChange('ffmpegAudioCodec', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--chakra-colors-bg-elevated)',
                            border: '1px solid var(--chakra-colors-border-default)',
                            color: 'var(--chakra-colors-fg-primary)',
                            outline: 'none',
                            fontSize: '13px',
                            cursor: 'pointer',
                            marginTop: '4px',
                          }}
                        >
                          <option value="copy" style={{ backgroundColor: 'var(--chakra-colors-bg-panel)' }}>
                            Copy Stream (Default, High Performance)
                          </option>
                          <option value="aac" style={{ backgroundColor: 'var(--chakra-colors-bg-panel)' }}>
                            Transcode to AAC (Recommended for ADTS errors)
                          </option>
                          <option value="none" style={{ backgroundColor: 'var(--chakra-colors-bg-panel)' }}>
                            Disable Audio (No Audio Stream)
                          </option>
                        </select>
                      </VStack>
                    </Box>
                  )}

                  <HStack justify="space-between" bg="rgba(255,255,255,0.01)" p={3} borderRadius="md" border="1px solid" borderColor="border.default">
                    <VStack align="flex-start" gap={0.5}>
                      <Text fontSize="sm" fontWeight="medium" color="fg.primary">Enable Movement Detection</Text>
                      <Text fontSize="xxs" color="fg.muted">Periodically poll motion APIs and trigger ML object parsing</Text>
                    </VStack>
                    <Switch.Root
                      disabled={!formValues.enable_streaming}
                      checked={formValues.enable_movement || false}
                      onCheckedChange={(e) => handleInputChange('enable_movement', e.checked)}
                    >
                      <Switch.HiddenInput />
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                    </Switch.Root>
                  </HStack>

                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                    <Box>
                      <Text fontSize="xs" color="fg.muted" mb={1.5}>Pre-Movement buffer (segments)</Text>
                      <Input
                        type="number"
                        disabled={!formValues.enable_streaming}
                        value={formValues.segments_prior_to_movement || 0}
                        onChange={(e) => handleInputChange('segments_prior_to_movement', Number(e.target.value))}
                        bg="bg.elevated"
                        borderColor="border.default"
                      />
                    </Box>
                    <Box>
                      <Text fontSize="xs" color="fg.muted" mb={1.5}>Post-Movement buffer (segments)</Text>
                      <Input
                        type="number"
                        disabled={!formValues.enable_streaming}
                        value={formValues.segments_post_movement || 0}
                        onChange={(e) => handleInputChange('segments_post_movement', Number(e.target.value))}
                        bg="bg.elevated"
                        borderColor="border.default"
                      />
                    </Box>
                  </SimpleGrid>

                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                    <Box>
                      <Text fontSize="xs" color="fg.muted" mb={1.5}>Motion Poll Frequency (ms)</Text>
                      <Input
                        type="number"
                        disabled={!formValues.enable_movement}
                        value={formValues.mSPollFrequency || 0}
                        onChange={(e) => handleInputChange('mSPollFrequency', Number(e.target.value))}
                        bg="bg.elevated"
                        borderColor="border.default"
                      />
                    </Box>
                    <Box>
                      <Text fontSize="xs" color="fg.muted" mb={1.5}>Extend Movement Cooldown (polls)</Text>
                      <Input
                        type="number"
                        disabled={!formValues.enable_movement}
                        value={formValues.pollsWithoutMovement || 0}
                        onChange={(e) => handleInputChange('pollsWithoutMovement', Number(e.target.value))}
                        bg="bg.elevated"
                        borderColor="border.default"
                      />
                    </Box>
                  </SimpleGrid>

                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                    <Box>
                      <Text fontSize="xs" color="fg.muted" mb={1.5}>Max. Single Movement Duration (sec)</Text>
                      <Input
                        type="number"
                        disabled={!formValues.enable_movement}
                        value={formValues.secMaxSingleMovement || 0}
                        onChange={(e) => handleInputChange('secMaxSingleMovement', Number(e.target.value))}
                        bg="bg.elevated"
                        borderColor="border.default"
                      />
                    </Box>
                    <Box>
                      <Text fontSize="xs" color="fg.muted" mb={1.5}>Startup Cooldown Delay (sec)</Text>
                      <Input
                        type="number"
                        disabled={!formValues.enable_movement}
                        value={formValues.secMovementStartupDelay || 0}
                        onChange={(e) => handleInputChange('secMovementStartupDelay', Number(e.target.value))}
                        bg="bg.elevated"
                        borderColor="border.default"
                      />
                    </Box>
                  </SimpleGrid>
                </VStack>
              </form>
            </Box>

            {errorMsg && (
              <Box p={3} mb={4} borderRadius="md" bg="rgba(244,67,54,0.1)" border="1px solid" borderColor="red.default">
                <Text fontSize="xs" color="#F44336">{errorMsg}</Text>
              </Box>
            )}

            <Separator mb={4} />

            <HStack justify="flex-end" gap={3}>
              <Button
                variant="outline"
                onClick={handleCloseModal}
                borderColor="border.default"
                color="fg.primary"
                _hover={{ bg: 'rgba(255,255,255,0.05)' }}
                cursor="pointer"
              >
                Close
              </Button>
              <Button
                type="submit"
                form="camera-form"
                bg="accent.default"
                color="white"
                _hover={{ bg: 'accent.hover' }}
                loading={saveMutation.isPending}
                cursor="pointer"
              >
                Save
              </Button>
            </HStack>
          </Box>
        </Box>
      )}

      {/* Delete / Reset recordings premium modal dialogue */}
      {deleteConfirmKey && (
        <Box
          position="fixed"
          inset={0}
          bg="rgba(0,0,0,0.8)"
          backdropFilter="blur(5px)"
          zIndex={100}
          display="flex"
          alignItems="center"
          justifyContent="center"
          p={4}
          onClick={() => setDeleteConfirmKey(null)}
        >
          <Box
            w="full"
            maxW="500px"
            bg="bg.panel"
            borderRadius="xl"
            border="1px solid"
            borderColor="border.default"
            p={6}
            boxShadow="2xl"
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'slideDown 0.2s ease-out',
            }}
          >
            <Text fontSize="lg" fontWeight="bold" color="fg.primary" mb={2}>
              Delete or Reset Camera Configuration?
            </Text>
            <Text fontSize="xs" color="fg.muted" mb={6}>
              Choose what action you want to take for the camera key <strong>{deleteConfirmKey}</strong>. This action is irreversible.
            </Text>

            <VStack gap={3} align="stretch" mb={6}>
              <Box
                as="button"
                p={4}
                borderRadius="lg"
                bg="rgba(255,255,255,0.01)"
                border="1px solid"
                borderColor="border.default"
                textAlign="left"
                _hover={{ bg: 'rgba(255,255,255,0.03)', borderColor: 'border.hover' }}
                onClick={() => handleDelete('del')}
                cursor="pointer"
              >
                <Text fontSize="sm" fontWeight="bold" color="fg.primary">
                  Delete Camera Configuration
                </Text>
                <Text fontSize="xxs" color="fg.muted">
                  Remove camera from active view lists, but preserve all recorded disk files & video database segments.
                </Text>
              </Box>

              <Box
                as="button"
                p={4}
                borderRadius="lg"
                bg="rgba(244, 67, 54, 0.05)"
                border="1px solid"
                borderColor="rgba(244, 67, 54, 0.2)"
                textAlign="left"
                _hover={{ bg: 'rgba(244, 67, 54, 0.1)', borderColor: '#F44336' }}
                onClick={() => handleDelete('delall')}
                cursor="pointer"
              >
                <Text fontSize="sm" fontWeight="bold" color="#F44336">
                  Delete Camera & All Recordings
                </Text>
                <Text fontSize="xxs" color="fg.muted">
                  Fully wipe camera configuration and delete all recorded HLS segments, movements, and images from disk immediately.
                </Text>
              </Box>

              <Box
                as="button"
                p={4}
                borderRadius="lg"
                bg="rgba(255,255,255,0.01)"
                border="1px solid"
                borderColor="border.default"
                textAlign="left"
                _hover={{ bg: 'rgba(255,255,255,0.03)', borderColor: 'border.hover' }}
                onClick={() => handleDelete('reset')}
                cursor="pointer"
              >
                <Text fontSize="sm" fontWeight="bold" color="fg.primary">
                  Reset Recordings Only
                </Text>
                <Text fontSize="xxs" color="fg.muted">
                  Keep the camera configuration running, but purge all past recordings and database history for this camera.
                </Text>
              </Box>
            </VStack>

            <Separator mb={4} />

            <HStack justify="flex-end">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmKey(null)}
                borderColor="border.default"
                color="fg.primary"
                _hover={{ bg: 'rgba(255,255,255,0.05)' }}
                cursor="pointer"
              >
                Cancel
              </Button>
            </HStack>
          </Box>
        </Box>
      )}

      {/* Slide-down modal animation */}
      <style jsx global>{`
        @keyframes slideDown {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </Box>
  );
}
