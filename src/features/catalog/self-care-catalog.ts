import type { SelfCareItem } from "@/lib/types";

export const selfCareCatalog: SelfCareItem[] = [
  {
    id: "stretching",
    title: "ストレッチ",
    description: "軽く体を伸ばす",
    sortOrder: 1,
    isArchived: false,
  },
  {
    id: "walking",
    title: "散歩",
    description: "短時間の歩行",
    sortOrder: 2,
    isArchived: false,
  },
  {
    id: "bath",
    title: "入浴",
    description: "湯船で体を温める",
    sortOrder: 3,
    isArchived: false,
  },
  {
    id: "meditation",
    title: "瞑想",
    description: "呼吸を整える",
    sortOrder: 4,
    isArchived: false,
  },
];
