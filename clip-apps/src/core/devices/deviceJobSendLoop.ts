/** Wait while sender is paused; returns false if canceled during pause. */
export async function waitUnlessSendCanceled(
  isCanceled: () => boolean,
  isPaused: () => boolean,
  pollMs = 100,
): Promise<boolean> {
  while (isPaused() && !isCanceled()) {
    await new Promise((r) => setTimeout(r, pollMs))
  }
  return !isCanceled()
}
