export type MapPin = {
  name: string;
  lat: number;
  lon: number;
  group: "here" | "compare" | "context";
  side?: "left" | "right" | "above";
};

export type AbroadStay = {
  id: string;
  theme: "doha" | "merida";
  kicker: string;
  place: string;
  program: string;
  coords: string;
  body: string[];
  facts: { label: string; value: string }[];
  map: {
    src: string;
    alt: string;
    width: number;
    height: number;
    /** Plate carrée bounds of the image: west, south, east, north. */
    bounds: [number, number, number, number];
    pins: MapPin[];
    /** Pairs of pin names joined by an arc. */
    arcs?: [string, string][];
    credit: string;
  };
};

export const abroad: AbroadStay[] = [
  {
    id: "doha",
    theme: "doha",
    kicker: "Study abroad · Spring 2025",
    place: "Doha, Qatar",
    program: "Texas A&M University at Qatar",
    coords: "25.32° N, 51.44° E",
    body: [
      "I spent the spring 2025 semester at Texas A&M's campus in Education City, Doha. My classes there were digital systems design, machine learning and differential equations, plus a physics lab.",
    ],
    facts: [
      { label: "Campus", value: "Education City, Doha" },
      { label: "Classes", value: "ECEN 248 · ECEN 250 · MATH 308 · ENGR 217" },
      { label: "From College Station", value: "About 12,900 km" },
    ],
    map: {
      src: "/images/abroad/doha-night.jpg",
      alt: "Night satellite view of Qatar and the surrounding Gulf coast, with Doha lit up on the east side of the peninsula",
      width: 1400,
      height: 1000,
      bounds: [49.0, 23.4, 54.6, 27.4],
      pins: [
        { name: "Texas A&M at Qatar", lat: 25.316, lon: 51.438, group: "here", side: "right" },
        { name: "Bahrain", lat: 26.07, lon: 50.55, group: "context", side: "right" },
        { name: "Saudi Arabia", lat: 24.4, lon: 49.5, group: "context", side: "right" },
        { name: "UAE", lat: 23.9, lon: 53.9, group: "context", side: "left" },
      ],
      credit: "NASA Black Marble",
    },
  },
  {
    id: "merida",
    theme: "merida",
    kicker: "Research abroad · Summer 2023",
    place: "Mérida, Yucatán",
    program: "Yucatán Initiative, Introduction to Research Abroad Program",
    coords: "20.97° N, 89.62° W",
    body: [
      "A Texas A&M research program run with the State of Yucatán. My project compared public and personal transportation in fast-growing cities: Mérida and Valladolid in Yucatán against Austin and San Antonio in Texas, framed around UN Sustainable Development Goal 11.",
      "The program also took us through about 20 research labs, including UADY, UNAM, CICY and CIATEJ.",
    ],
    facts: [
      { label: "Compared", value: "Mérida and Valladolid vs. Austin and San Antonio" },
      { label: "Framing", value: "UN SDG 11.6, the environmental impact of cities" },
      { label: "Methods", value: "Literature review, meta-analysis, hypothesis framing" },
    ],
    map: {
      src: "/images/abroad/texas-yucatan-night.jpg",
      alt: "Night satellite view of the Gulf of Mexico, with the lights of Texas at the top and the Yucatán Peninsula at the bottom right",
      width: 1500,
      height: 1300,
      bounds: [-100.5, 18.5, -85.5, 31.5],
      pins: [
        { name: "Austin", lat: 30.267, lon: -97.743, group: "compare", side: "right" },
        { name: "San Antonio", lat: 29.424, lon: -98.494, group: "compare", side: "right" },
        { name: "Mérida", lat: 20.967, lon: -89.623, group: "here", side: "left" },
        { name: "Valladolid", lat: 20.689, lon: -88.201, group: "here", side: "above" },
      ],
      arcs: [["San Antonio", "Mérida"]],
      credit: "NASA Black Marble",
    },
  },
];
