import type { Modifier } from '@dnd-kit/core';

/** Arrastar só na vertical (evita instalar @dnd-kit/modifiers por uma função) */
export const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 });
