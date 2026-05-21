'use client';

import { Box, BoxProps } from '@chakra-ui/react';

export function KannnLogo(props: BoxProps) {
  return (
    <Box {...props}>
      <svg
        viewBox="20 20 61 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          {/* A mask to cut out a transparent hole for the lens glass */}
          <mask id="lens-cutout">
            {/* Everything white stays */}
            <rect x="0" y="0" width="120" height="120" fill="white" />
            {/* Everything black is cut out (becomes transparent) */}
            <ellipse
              cx="74.5"
              cy="34"
              rx="3.8"
              ry="5.8"
              transform="rotate(15 74.5 34)"
              fill="black"
            />
          </mask>
        </defs>

        {/* Group with the transparent lens cutout mask applied */}
        <g mask="url(#lens-cutout)">
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

          {/* Camera Lens Bezel */}
          <ellipse
            cx="74.5"
            cy="34"
            rx="5"
            ry="7.5"
            transform="rotate(15 74.5 34)"
            fill="currentColor"
          />
        </g>

        {/* Camera Lens Center Iris (drawn on top of the hole) */}
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
