export type Coordinates = [number, number];
export type Place = {
  id: string;
  title: string;
  subtitle: string;
  coordinates: Coordinates;
  period: string;
  description: string;
  source: string;
  sourceLabel: string;
  archivePhoto?: string;
  locationNote?: string;
};

export const PIMLICO_CENTER: Coordinates = [-0.1394, 51.4886];
export const LONDON_BOUNDS = [-0.51, 51.28, 0.34, 51.7] as const;
// A deliberately broad neighbourhood extent, not an assertion of sheet boundaries.
export const PIMLICO_BOUNDS = [-0.151, 51.48, -0.125, 51.498] as const;
export const ARCHIVE_URL =
  "https://www.londonpicturearchive.org.uk/view-item?i=343662";
export const ARCHIVE_EMBED_URL =
  "https://www.londonpicturearchive.org.uk/embed-item?ref=346262";

export const places: Place[] = [
  {
    id: "cambridge-street",
    title: "Cambridge Street",
    subtitle: "A street rebuilt in places",
    coordinates: [-0.1399662, 51.4883491],
    period: "1940 → post-war",
    description:
      "On Cambridge Street, Russell House connects the present-day neighbourhood to the Blitz. The Pimlico Neighbourhood Plan records that the flats were built on the site of a 1940 bomb strike. Look along the street on the original sheet to explore its earlier fabric.",
    locationNote:
      "The pin marks Cambridge Street, not the footprint of Russell House.",
    source:
      "https://www.westminster.gov.uk/sites/default/files/media/documents/PNP2%20-%20PNF%20Plan_revised_digital.pdf",
    sourceLabel: "Pimlico Neighbourhood Plan, paragraph 18",
  },
  {
    id: "belgrave-road",
    title: "11 Belgrave Road",
    subtitle: "A church, then a new chapter",
    coordinates: [-0.1421263, 51.4924578],
    period: "1941 → 1950s",
    description:
      "The archive records that Eccleston Square Congregational Church was destroyed by bombing in 1941. A post-war office building took its place in the mid-1950s. A photograph taken in 1974 documents the later streetscape.",
    source: "https://www.londonpicturearchive.org.uk/view-item?i=128198",
    sourceLabel: "London Picture Archive · record 125970",
    archivePhoto: "https://www.londonpicturearchive.org.uk/view-item?i=128198",
  },
  {
    id: "churchill-gardens",
    title: "Churchill Gardens",
    subtitle: "The shape of post-war Pimlico",
    coordinates: [-0.141645, 51.4864505],
    period: "Post-war rebuilding",
    description:
      "Churchill Gardens is part of the story of how Pimlico changed after the war. Historic England documents the estate and its carefully planned gardens. Its development history provides context; the damage sheet records the earlier streets and buildings.",
    source:
      "https://historicengland.org.uk/listing/the-list/list-entry/1469043",
    sourceLabel: "Historic England · list entry 1469043",
  },
];

export const damageKey = [
  { color: "#332e37", label: "Total destruction" },
  { color: "#77507f", label: "Damaged beyond repair" },
  { color: "#a84954", label: "Seriously damaged; repair doubtful" },
  { color: "#dc939a", label: "Seriously damaged; repairable at cost" },
  { color: "#d89854", label: "General blast damage; not structural" },
  { color: "#e4c96b", label: "Minor blast damage" },
];

export function inBounds(coordinates: Coordinates, bounds: readonly number[]) {
  const [lng, lat] = coordinates;
  return (
    lng >= bounds[0] && lng <= bounds[2] && lat >= bounds[1] && lat <= bounds[3]
  );
}
export function isPimlico(coordinates: Coordinates) {
  return inBounds(coordinates, PIMLICO_BOUNDS);
}
