'use client';

import { Box, VStack, Text, HStack, Separator } from '@chakra-ui/react';
import { NavItem } from './NavItem';
import { useColorMode } from '@/providers/ColorModeProvider';
import { KannnLogo } from './KannnLogo';

export function Sidebar() {
  const { toggleColorMode, colorMode } = useColorMode();

  return (
    <Box
      as="nav"
      w="240px"
      h="100vh"
      position="fixed"
      left={0}
      top={0}
      bg="bg.elevated"
      borderRight="1px solid"
      borderColor="border.default"
      display="flex"
      flexDirection="column"
      py={6}
      px={3}
      zIndex={50}
    >
      <HStack px={4} mb={8} gap={3} align="center">
        <KannnLogo w="42px" h="34px" color="fg.primary" />
        <VStack align="start" gap={0}>
          <Text fontSize="lg" fontWeight="bold" lineHeight="none" color="fg.primary">
            Kannn
          </Text>
          <Text fontSize="2xs" fontWeight="bold" letterSpacing="wider" color="fg.muted" mt={0.5}>
            NVR SYSTEM
          </Text>
        </VStack>
      </HStack>

      <VStack gap={1} align="stretch" flex={1}>
        <NavItem href="/" label="Live View" icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        } />
        <NavItem href="/movements" label="Movements" icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        } />
        <NavItem href="/playback" label="Playback" icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
        } />
        <NavItem href="/stats" label="Statistics" icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        } />
        <NavItem href="/cameras" label="Cameras" icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        } />
        <NavItem href="/settings" label="Settings" icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        } />
      </VStack>

      <Separator mb={4} borderColor="border.default" />

      <Box px={4}>
        <Box
          as="button"
          onClick={toggleColorMode}
          display="flex"
          alignItems="center"
          gap={3}
          w="full"
          px={4}
          py={3}
          borderRadius="md"
          color="fg.secondary"
          _hover={{ bg: 'accent.hover', color: 'fg.primary' }}
          transition="all 0.15s ease"
          cursor="pointer"
        >
          <Text fontSize="sm" fontWeight="medium">
            {colorMode === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
