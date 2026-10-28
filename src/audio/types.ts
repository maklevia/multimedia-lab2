export interface PlaybackCallbacks {
  onProgress: (progress: number) => void;
  onEnd: () => void;
}
