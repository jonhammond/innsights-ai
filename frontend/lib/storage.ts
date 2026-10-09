import { Platform } from "react-native";

export function readStored(key: string): string | null {
  if (Platform.OS !== "web") return null;
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string): void {
  if (Platform.OS !== "web") return;
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // storage unavailable (private mode, quota); ignore
  }
}
