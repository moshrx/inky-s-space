// Constellation geometry.
//
// Star positions come from placeStar(), which scatters a week's poems randomly
// inside a disk. Connecting those in publish order produced a zigzag that
// crossed itself — the order and the geometry are uncorrelated, so no amount
// of line styling could make it read as a figure.
//
// Instead we derive the shape from the positions themselves: walk the convex
// hull to get a closed outline that can never self-intersect, then attach any
// star trapped inside to its nearest hull vertex so nothing is left unjoined.
//
// Everything here is pure and render-time only. No stored coordinate is
// changed, so the sky a reader already knows stays exactly where it was.

export interface Pt {
  id: string;
  x: number;
  y: number;
}

export interface Segment {
  /** Endpoint ids, for stable React keys. */
  aId: string;
  bId: string;
  ax: number;
  ay: number;
  bx: number;
  by: number;
  /** Hull edges are the figure; spokes tie interior stars in more faintly. */
  kind: "hull" | "spoke";
}

/** Cross product of OA × OB. >0 = counter-clockwise turn. */
function cross(o: Pt, a: Pt, b: Pt) {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/**
 * Monotone chain convex hull. Returns hull vertices in counter-clockwise
 * order. Duplicate and collinear points are dropped, so the result is the
 * minimal set of corners describing the outline.
 */
export function convexHull(points: Pt[]): Pt[] {
  if (points.length < 3) return points.slice();

  const pts = points
    .slice()
    .sort((p, q) => (p.x === q.x ? p.y - q.y : p.x - q.x));

  const lower: Pt[] = [];
  for (const p of pts) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: Pt[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }

  // Last point of each chain is the first of the other.
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/**
 * Build the drawable segments for one cluster.
 *
 * - 1 star  → nothing to join.
 * - 2 stars → a single line.
 * - 3+      → closed hull outline, plus a spoke from each interior star to its
 *             nearest hull vertex.
 *
 * A cluster whose stars are all collinear degenerates to a hull of 2 points;
 * that still draws correctly as an open line rather than throwing.
 */
export function constellationSegments(points: Pt[]): Segment[] {
  if (points.length < 2) return [];

  const seg = (a: Pt, b: Pt, kind: Segment["kind"]): Segment => ({
    aId: a.id,
    bId: b.id,
    ax: a.x,
    ay: a.y,
    bx: b.x,
    by: b.y,
    kind,
  });

  if (points.length === 2) {
    return [seg(points[0], points[1], "hull")];
  }

  const hull = convexHull(points);

  // Fewer than 3 hull corners means every star is collinear — draw the spine
  // between the two extremes and hang the rest off it as spokes.
  if (hull.length < 3) {
    if (hull.length < 2) return [];
    const [a, b] = hull;
    const out = [seg(a, b, "hull")];
    for (const p of points) {
      if (p.id === a.id || p.id === b.id) continue;
      out.push(seg(p, nearest(p, [a, b])!, "spoke"));
    }
    return out;
  }

  const segments: Segment[] = [];
  for (let i = 0; i < hull.length; i++) {
    segments.push(seg(hull[i], hull[(i + 1) % hull.length], "hull"));
  }

  // Tie interior stars in. Connect to the nearest *already-connected* star
  // rather than only to hull corners: that keeps each spoke short enough to
  // read as a deliberate link, and lets interior stars chain to one another
  // instead of all reaching past each other to the rim.
  const onHull = new Set(hull.map((p) => p.id));
  const connected = hull.slice();
  const interior = points.filter((p) => !onHull.has(p.id));

  // Nearest-first keeps the chain growing outward from the existing figure.
  interior.sort((a, b) => distToSet(a, connected) - distToSet(b, connected));
  for (const p of interior) {
    const target = nearest(p, connected);
    if (target) {
      segments.push(seg(p, target, "spoke"));
      connected.push(p);
    }
  }

  return segments;
}

/** Squared distance from `p` to the closest member of `set`. */
function distToSet(p: Pt, set: Pt[]): number {
  let best = Infinity;
  for (const c of set) {
    if (c.id === p.id) continue;
    const d = (c.x - p.x) ** 2 + (c.y - p.y) ** 2;
    if (d < best) best = d;
  }
  return best;
}

/** Closest point in `candidates` to `p`, excluding p itself. */
function nearest(p: Pt, candidates: Pt[]): Pt | null {
  let best: Pt | null = null;
  let bestD = Infinity;
  for (const c of candidates) {
    if (c.id === p.id) continue;
    const d = (c.x - p.x) ** 2 + (c.y - p.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}
