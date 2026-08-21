// gifenc ships no types (https://github.com/mattdesl/gifenc) — minimal
// declarations covering only the API surface this project actually uses.
declare module "gifenc" {
  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray | Buffer,
    maxColors: number,
    options?: Record<string, unknown>
  ): number[][];

  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray | Buffer,
    palette: number[][],
    format?: string
  ): Uint8Array;

  export type GIFEncoderWriteFrameOptions = {
    palette?: number[][];
    delay?: number;
    repeat?: number;
    transparent?: boolean;
    transparentIndex?: number;
    dispose?: number;
    first?: boolean;
  };

  export type GIFEncoderInstance = {
    writeFrame: (
      index: Uint8Array,
      width: number,
      height: number,
      opts?: GIFEncoderWriteFrameOptions
    ) => void;
    finish: () => void;
    bytes: () => Uint8Array;
    bytesView: () => Uint8Array;
    writeHeader: () => void;
    reset: () => void;
    buffer: ArrayBuffer;
    stream: unknown;
  };

  export function GIFEncoder(options?: { auto?: boolean; initialCapacity?: number }): GIFEncoderInstance;
}
