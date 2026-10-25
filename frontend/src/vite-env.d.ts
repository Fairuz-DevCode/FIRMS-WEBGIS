/// <reference types="vite/client" />

declare module '*.geojson' {
  const content: any;
  export default content;
}

declare module '*.json' {
  const content: any;
  export default content;
}
