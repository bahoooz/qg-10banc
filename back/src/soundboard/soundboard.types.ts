export type SoundboardClipDto = {
  id: string;
  name: string;
  src: string;
  tags: string[];
  category: string;
  source: "voicy" | "myinstants";
};

export type SoundboardSearchResponse = {
  clips: SoundboardClipDto[];
  source: "voicy" | "myinstants" | "mixed";
};
