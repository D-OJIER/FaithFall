import { art } from '../art';
import type { IconName } from '../art';

/** A small inline icon from the kit. */
export const Icon = ({ name, size = 16, label }: { name: IconName; size?: number; label?: string }) => (
  <img src={art.icon(name)} width={size} height={size} alt={label ?? ''} aria-hidden={label ? undefined : true} style={{ verticalAlign: 'middle', flex: 'none' }} draggable={false} />
);
