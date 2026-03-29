export interface AdventureDef {
  id: string;
  name: string;
  description: string;
  /** Ordered scenario IDs that make up this adventure. */
  scenarios: string[];
  /** Narrative text shown before each battle (index 0 = before first battle, etc.). */
  introTexts: string[];
  /** Narrative text shown between battles (index 0 = after battle 1, etc.). */
  transitions: string[];
  /** Text shown after completing the final battle. */
  victoryText: string;
  /** Gold reward for completing the full adventure. */
  totalReward: number;
}

export const ADVENTURES: AdventureDef[] = [
  {
    id: "barrow_creek",
    name: "The Barrow Creek Raid",
    description:
      "Brigands have taken over the village of Barrow Creek. Your mercenary company is hired to clear them out in three phases.",
    scenarios: ["barrow_creek_1", "barrow_creek_2", "barrow_creek_3"],
    introTexts: [
      "Your company approaches Barrow Creek along the old trade road. Smoke rises in the distance — the brigands have been busy. Scout reports say they've posted sentries at the stone bridge over the creek. That bridge is your only way across without a half-day detour. Time to clear it.",
      "The bridge is yours. Beyond the creek, the road leads to an old grain mill the brigands have turned into a strongpoint. Barricades of lumber and overturned carts block the approaches, and a bowman has been spotted on the hill above. Expect a tougher fight.",
      "The mill has fallen. Captured brigands confirm their leader — a former soldier turned bandit chief — is camped in the valley beyond with his best fighters. He won't run. This is the final push. End this and Barrow Creek is free.",
    ],
    transitions: [
      "With the scouts dispatched, the path across the bridge is clear. Your company moves forward along the muddy road. Ahead, the old grain mill looms against the grey sky.",
      "The mill yard is yours. Wounded brigands scatter into the woods. But the job isn't done — the leader still holds the camp. Your fighters catch their breath and press on into the valley.",
    ],
    victoryText:
      "The brigand leader falls. His remaining fighters throw down their arms. Barrow Creek is liberated. The grateful villagers pay your company the promised sum, plus a little extra from what the brigands hadn't yet stolen. A good day's work.",
    totalReward: 500,
  },
];

export function getAdventure(id: string): AdventureDef | undefined {
  return ADVENTURES.find((a) => a.id === id);
}

export function getAllAdventures(): AdventureDef[] {
  return ADVENTURES;
}
