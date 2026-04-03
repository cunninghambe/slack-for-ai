/// <reference types="vite/client" />

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

declare module '*.svg' {
  import React from 'react';
  const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  export { ReactComponent };
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}
