'use client';

import { Box, BoxProps } from '@chakra-ui/react';

export function KannnLogo(props: BoxProps) {
  return (
    <Box {...props}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%' }}
      >
        {/* Main K Stem and Bottom Leg */}
        <path
          d="M36 20H28C22 20 20 22 20 28V70H36V48L55 70H74L45 44L36 36V20Z"
          fill="currentColor"
        />
        
        {/* Camera Body / Upper Arm */}
        <path
          d="M36 40L72 26.5C77 25 80.5 28 80.5 32C80.5 33 80 34 79 35C74 38 68 40.5 61 42L36 47V40Z"
          fill="currentColor"
        />

        {/* Camera Lens Bezel (Tilted) */}
        <ellipse
          cx="74.5"
          cy="34"
          rx="5"
          ry="7.5"
          transform="rotate(15 74.5 34)"
          fill="currentColor"
        />

        {/* Inner Lens Glass (creates the hollow look) */}
        <ellipse
          cx="74.5"
          cy="34"
          rx="3.5"
          ry="5.5"
          transform="rotate(15 74.5 34)"
          fill="var(--logo-bg-color, var(--chakra-colors-bg-elevated, #1a1a1a))"
        />

        {/* Camera Lens Center Iris */}
        <circle
          cx="74"
          cy="34"
          r="2.2"
          fill="currentColor"
        />

        {/* Lens Reflection Highlight (White Shine) */}
        <circle
          cx="72.8"
          cy="32.8"
          r="0.8"
          fill="white"
        />
      </svg>
    </Box>
  );
}
