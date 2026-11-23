// CSS custom properties used by the leap animation (--from / --to years).
import 'react';

declare module 'react' {
  interface CSSProperties {
    '--from'?: number;
    '--to'?: number;
  }
}
