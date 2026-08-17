export type SoundboardCatalogItem = {
  id: string;
  name: string;
  tags: string[];
  src: string;
  category: string;
  source?: "voicy" | "myinstants" | "custom";
};

export type SoundboardSearchResult = {
  clips: SoundboardCatalogItem[];
  source: "voicy" | "myinstants" | "mixed";
};
