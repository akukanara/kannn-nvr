'use client';

import { ChakraProvider } from '@chakra-ui/react';
import { system } from '@/lib/theme';
import { ColorModeProvider } from './ColorModeProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ChakraProvider value={system}>
      <ColorModeProvider>{children}</ColorModeProvider>
    </ChakraProvider>
  );
}
