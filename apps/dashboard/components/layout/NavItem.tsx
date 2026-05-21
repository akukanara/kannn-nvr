'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, Text } from '@chakra-ui/react';

interface NavItemProps {
  href: string;
  label: string;
  icon?: React.ReactNode;
}

export function NavItem({ href, label, icon }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <Link href={href} passHref style={{ textDecoration: 'none' }}>
      <Box
        display="flex"
        alignItems="center"
        gap={3}
        px={4}
        py={3}
        borderRadius="md"
        transition="all 0.15s ease"
        bg={isActive ? 'accent.default' : 'transparent'}
        color={isActive ? 'fg.primary' : 'fg.secondary'}
        _hover={{
          bg: 'accent.hover',
          color: 'fg.primary',
        }}
        cursor="pointer"
      >
        {icon && (
          <Box as="span" fontSize="lg" lineHeight={1} color="fg.muted">
            {icon}
          </Box>
        )}
        <Text fontSize="sm" fontWeight="medium">
          {label}
        </Text>
      </Box>
    </Link>
  );
}
