// Level art loading: backdrops and goal vignettes live in public/art and are
// fetched as plain images. A missing file resolves null so play never breaks
// (offline first-launch, pruned precache); renderers fall back to paint.
type ImageConstructor = new () => HTMLImageElement;

function imageConstructor(): ImageConstructor | null {
  const globalImage = (globalThis as { Image?: unknown }).Image;
  if (typeof globalImage !== 'function') {
    return null;
  }
  // Justified cast: the typeof guard above narrows unknown to a callable, and
  // only its construct signature is assumed (returning the DOM image type).
  return globalImage as ImageConstructor;
}

/** Loads one art file; resolves null when unavailable or unloadable. */
export function loadArtImage(url: string): Promise<HTMLImageElement | null> {
  const CreateImage = imageConstructor();
  if (!CreateImage) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const element = new CreateImage();
    element.onload = () => resolve(element);
    element.onerror = () => resolve(null);
    element.src = url;
  });
}
