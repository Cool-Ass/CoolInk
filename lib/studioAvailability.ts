type Range = { startsAt: Date; endsAt: Date };
/** Strict overlap: adjacent ranges are allowed only once the required buffer ends. */
export function studioRangesOverlap(a: Range, b: Range, bufferMinutes = 0) {
  return +a.startsAt < +b.endsAt + bufferMinutes * 60_000 && +a.endsAt > +b.startsAt - bufferMinutes * 60_000;
}
