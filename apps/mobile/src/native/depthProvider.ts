import { NativeModules, Platform } from 'react-native';

export type NativeDepthSource = 'ARCORE_DEPTH_API' | 'TOF_SENSOR' | 'SIMULATED' | 'UNKNOWN';

export type NativeDepthUnit = 'meters' | 'millimeters' | 'normalized' | 'unknown';

export interface DepthFrame {
  width: number;
  height: number;
  /** Depth buffer in meters or millimeters, row-major order */
  data: number[];
  /** Optional per-pixel confidence between 0-1 */
  confidence?: number[];
  /** Provider specific source string */
  source?: NativeDepthSource;
  /** Unit reported by the provider */
  unit?: NativeDepthUnit;
  /** Timestamp emitted by the native depth API */
  timestamp?: number;
}

export interface DepthRequestOptions {
  /** URI of the associated color image. */
  imageUri?: string;
  /** Width hint to request a resized depth frame from native. */
  targetWidth?: number;
  /** Height hint to request a resized depth frame from native. */
  targetHeight?: number;
}

interface NativeDepthModule {
  getDepthMap(options: DepthRequestOptions): Promise<DepthFrame | null>;
  isSupported?: () => boolean | Promise<boolean>;
}

const MODULE_NAME = 'ToposonicsDepthProvider';

const nativeModule = NativeModules[MODULE_NAME] as NativeDepthModule | undefined;

/**
 * Safely request a depth map from the native provider. If the module is
 * unavailable or throws, `null` is returned so callers can gracefully
 * fall back to heuristics.
 */
export async function requestNativeDepthMap(
  options: DepthRequestOptions
): Promise<DepthFrame | null> {
  if (!nativeModule) {
    console.warn(
      `${MODULE_NAME} native module is unavailable; falling back to heuristic depth`
    );
    return null;
  }

  try {
    const frame = await nativeModule.getDepthMap(options);
    if (!frame || !Array.isArray(frame.data)) {
      return null;
    }

    return {
      ...frame,
      source: frame.source ?? 'UNKNOWN',
      unit: frame.unit ?? 'meters',
    };
  } catch (error) {
    console.warn('Failed to read native depth frame', error);
    return null;
  }
}

export async function hasNativeDepthSupport(): Promise<boolean> {
  if (!nativeModule) {
    return false;
  }

  const support = nativeModule.isSupported?.();

  if (support instanceof Promise) {
    try {
      return await support;
    } catch (error) {
      console.warn('Depth support check failed', error);
      return false;
    }
  }

  if (typeof support === 'boolean') {
    return support;
  }

  // Fallback: only Android devices running Google Play services support ARCore Depth API.
  return Platform.OS === 'android';
}
