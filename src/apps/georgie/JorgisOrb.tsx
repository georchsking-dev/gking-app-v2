import * as React from 'react';

import MicRoundedIcon from '@mui/icons-material/MicRounded';
import StopRoundedIcon from '@mui/icons-material/StopRounded';
import { Box, IconButton, Typography } from '@mui/joy';

export type JorgisState = 'idle' | 'listening' | 'thinking' | 'executing' | 'speaking' | 'error';

const STATE_META: Record<JorgisState, { label: string; rgb: string }> = {
  idle: { label: 'En espera', rgb: '0, 229, 255' },
  listening: { label: 'Escuchando…', rgb: '54, 255, 191' },
  thinking: { label: 'Pensando…', rgb: '142, 92, 255' },
  executing: { label: 'Ejecutando…', rgb: '255, 62, 181' },
  speaking: { label: 'Hablando…', rgb: '70, 144, 255' },
  error: { label: 'Necesito atención', rgb: '255, 83, 112' },
};

export function JorgisOrb(props: {
  state: JorgisState;
  level: number;
  disabled?: boolean;
  onToggleListening: () => void;
}) {
  const meta = STATE_META[props.state];
  const isListening = props.state === 'listening';
  const isActive = props.state !== 'idle' && props.state !== 'error';
  const voiceScale = isListening ? 1 + props.level * 0.18 : 1;

  return <Box sx={{ display: 'grid', placeItems: 'center', gap: 2.25 }}>
    <Box
      data-testid='jorgis-orb'
      data-state={props.state}
      sx={{
        '--jorgis-rgb': meta.rgb,
        position: 'relative',
        width: { xs: 220, sm: 270 },
        height: { xs: 220, sm: 270 },
        display: 'grid',
        placeItems: 'center',
        borderRadius: '50%',
        isolation: 'isolate',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: '-9%',
          borderRadius: '50%',
          border: '1px solid rgba(var(--jorgis-rgb), .22)',
          background: 'conic-gradient(from 90deg, transparent 0 18%, rgba(var(--jorgis-rgb), .55) 25%, transparent 34% 61%, rgba(181, 71, 255, .42) 70%, transparent 79%)',
          mask: 'radial-gradient(transparent 64%, #000 65%)',
          animation: isActive ? 'jorgis-spin 8s linear infinite' : 'none',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: '8%',
          zIndex: -1,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(var(--jorgis-rgb), .34), rgba(var(--jorgis-rgb), .07) 52%, transparent 72%)',
          filter: 'blur(7px)',
          transform: `scale(${voiceScale})`,
          transition: 'transform 90ms linear, background .35s ease',
          animation: isActive ? 'jorgis-breathe 2.2s ease-in-out infinite' : 'none',
        },
        '@keyframes jorgis-spin': { to: { transform: 'rotate(360deg)' } },
        '@keyframes jorgis-breathe': { '0%, 100%': { opacity: .65 }, '50%': { opacity: 1 } },
        '@media (prefers-reduced-motion: reduce)': {
          '&::before, &::after': { animation: 'none' },
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: '18%',
          borderRadius: '50%',
          border: '1px solid rgba(var(--jorgis-rgb), .68)',
          background: 'radial-gradient(circle at 35% 28%, rgba(255,255,255,.2), rgba(var(--jorgis-rgb), .13) 28%, rgba(6, 10, 28, .92) 72%)',
          boxShadow: 'inset 0 0 35px rgba(var(--jorgis-rgb), .22), 0 0 24px rgba(var(--jorgis-rgb), .35), 0 0 75px rgba(var(--jorgis-rgb), .18)',
          transform: `scale(${voiceScale})`,
          transition: 'transform 90ms linear, border-color .35s ease, box-shadow .35s ease',
        }}
      />
      <IconButton
        aria-label={isListening ? 'Detener micrófono' : 'Hablar con Jorgis'}
        data-testid='jorgis-orb-button'
        disabled={props.disabled}
        onClick={props.onToggleListening}
        sx={{
          width: 82,
          height: 82,
          borderRadius: '50%',
          color: `rgb(${meta.rgb})`,
          border: '1px solid rgba(var(--jorgis-rgb), .48)',
          bgcolor: 'rgba(3, 8, 24, .72)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 0 28px rgba(var(--jorgis-rgb), .25)',
          '&:hover': { bgcolor: 'rgba(var(--jorgis-rgb), .13)' },
        }}
      >
        {isListening ? <StopRoundedIcon sx={{ fontSize: 38 }} /> : <MicRoundedIcon sx={{ fontSize: 38 }} />}
      </IconButton>
    </Box>
    <Box sx={{ textAlign: 'center' }}>
      <Typography level='title-lg' sx={{ color: `rgb(${meta.rgb})`, letterSpacing: '.04em', textShadow: '0 0 18px rgba(var(--jorgis-rgb), .44)' }}>
        {meta.label}
      </Typography>
      <Typography level='body-sm' sx={{ mt: .5, color: 'rgba(224, 236, 255, .62)' }}>
        {isListening ? 'Habla con naturalidad' : 'Toca el núcleo o el micrófono para hablar'}
      </Typography>
    </Box>
  </Box>;
}
