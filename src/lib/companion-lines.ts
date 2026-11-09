import type { PetKind } from "./pets";

export type MoodId = "idle" | "studying" | "focused" | "break" | "celebrate" | "paused" | "sleeping";

/** Short, funny and adorable things the companion says. */
export const MOOD_LINES: Record<MoodId, string[]> = {
  idle: [
    "Ready when you are.",
    "Human, are we studying or scrolling again?",
    "Pick a timer and let's begin.",
    "Nap first, productivity later?",
    "Small steps still count.",
  ],
  studying: [
    "One more page. I believe in you!",
    "Psst… you're doing great.",
    "We've got this!",
    "I'm taking notes too.",
    "Deep breath. Next line.",
  ],
  focused: [
    "We're on a roll today!",
    "Your focus is my favourite thing.",
    "Look at us go.",
    "Focus mode: activated.",
  ],
  break: [
    "I deserve a treat for supervising you.",
    "Break time! Stretch those paws.",
    "Sip some water, okay?",
    "Rest is part of the plan.",
  ],
  celebrate: ["One more session in the books!", "We did it! Proud of us.", "Another one done. Purrfect."],
  paused: ["Taking a breather?", "I'll wait right here.", "Whenever you're ready."],
  sleeping: ["zzz… wake me when we study…", "*soft snoring*", "Five more minutes…"],
};

export const PET_LINES: Record<PetKind, string[]> = {
  cat: ["Purrrr…", "Hehe, that tickles!", "More head scratches, please.", "You're my favourite study buddy."],
  puppy: ["*happy tail wags*", "Best. Human. Ever.", "Again! Again!", "Can we go for a walk after this chapter?"],
  bunny: ["*nose wiggle*", "Soft pats only, please.", "Bunny approved.", "You smell like carrots. Nice."],
  shiba: ["*head tilt*", "Much study. Very wow.", "I allow this.", "Okay, one more pat. Then work."],
};

export const ACTION_LINES = {
  tooMuch: ["Stop clicking me and finish your work!", "Okay okay, I'm awake!", "Hey! I'm supervising here."],
  zoomies: ["ZOOMIES!!", "Whee— oh no, dizzy…", "That's it, I'm spinning."],
  eat: ["Nom nom nom.", "Snack break approved.", "Crunchy. Five stars."],
  drink: ["*slurp slurp*", "Hydration buddy!", "You drink some water too."],
  sleep: ["Just resting my eyes…", "Wake me if the chapter gets exciting.", "Nap first, productivity later?"],
  play: ["Gotcha! …it got away.", "This is serious training.", "One more round!"],
  wave: ["Hi hi!", "*waves paw*", "Hello, study partner!"],
  wake: ["I'm up! I'm up!", "Was I snoring?", "Back to the desk!"],
  type: ["Let me help… asdfghjkl", "I'm writing your essay. It's about fish.", "Typing at 3 words per minute."],
  lampOff: ["Cozy dark mode.", "Ooh, moody."],
  lampOn: ["Let there be light!", "Ahh, much better."],
  party: ["DISCO LAMP!", "Is this a study party?"],
  mug: ["Careful, it's hot!", "Smells like focus.", "One sip for you, one for me?"],
  bird: ["A birdie! Can I go outside?", "Did you see that?!"],
  ladybug: ["A tiny visitor on the plant!", "Ladybug! Make a wish."],
  plant: ["Grow, little plant, grow!", "It likes you."],
};

export const BOOK_QUOTES = [
  "Slow progress is still progress.",
  "You don't have to see the whole staircase. Just take the next step.",
  "Small steps every day add up to big things.",
  "Done is better than perfect.",
  "Focus on the page in front of you.",
  "The expert in anything was once a beginner.",
  "Discipline is choosing what you want most over what you want now.",
  "A little bit every day is how mountains move.",
  "Future you is already proud.",
  "Rest if you must, but don't quit.",
  "You are capable of more than you think.",
  "Learning is a gift that keeps on giving.",
];

export function clockMessage(hour: number): string {
  if (hour < 5) return "It's very late. A short session, then sleep?";
  if (hour < 9) return "Early bird hours. Your brain is fresh!";
  if (hour < 12) return "Morning focus is the best focus.";
  if (hour < 14) return "Lunch fuels the next chapter.";
  if (hour < 17) return "Afternoon push. You've got this.";
  if (hour < 20) return "Golden hour study session.";
  if (hour < 23) return "Cozy evening grind. Keep it gentle.";
  return "Night owl mode. Don't forget to rest.";
}

export function pickLine(list: string[], avoid?: string): string {
  const options = list.length > 1 ? list.filter((l) => l !== avoid) : list;
  return options[Math.floor(Math.random() * options.length)] ?? "";
}

/**
 * Speech bubbles never appear more often than these gaps (measured from the
 * last line of any kind). Clicking a room object answers a little sooner.
 */
export const MESSAGE_GAP = { object: 1_500, interaction: 5_000, auto: 25_000 } as const;

export function canSpeak(lastSaidAt: number, now: number, kind: keyof typeof MESSAGE_GAP): boolean {
  return now - lastSaidAt >= MESSAGE_GAP[kind];
}
