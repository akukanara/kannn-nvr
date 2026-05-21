'use client';

import { Box } from '@chakra-ui/react';
import { Sidebar } from './Sidebar';

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box minH="100vh" bg="bg.page" color="fg.primary">
      <Sidebar />
      <Box ml="240px" minH="100vh" p={6}>
        {children}
      </Box>
    </Box>
  );
}
