// Smart Bad-Habit Library: each entry picks its tracking engine, plan, reality checks and micro-solutions.
// wean = shrinking daily allowance (hard to quit overnight); cold = clean-streak timer (binary habits).

export interface LibHabit {
  id: string;
  name: string;
  mode: 'wean' | 'cold';
  unit?: string;
  baseline?: number; // typical starting amount per day
  stepPct?: number; // allowance cut per step
  stepDays?: number; // days between steps
  quotes: string[];
  tips: string[];
  swap: string; // replacement habit
}

export const LIBRARY: LibHabit[] = [
  {
    id: 'smoking', name: 'Smoking', mode: 'wean', unit: 'cigarettes', baseline: 10, stepPct: 0.15, stepDays: 4,
    quotes: [
      'Every cigarette is a loan against your lungs. The interest is brutal.',
      "You're not relaxing. You're relieving the withdrawal the last one caused.",
      'Ten minutes of smoke, ten minutes of life you will want back.',
    ],
    tips: ['Delay each one by 10 minutes', 'Keep your hands busy: a pen, a stress ball', 'Drink a glass of cold water when a craving hits'],
    swap: 'A 5-minute walk outside',
  },
  {
    id: 'doomscroll', name: 'Doomscrolling', mode: 'wean', unit: 'minutes', baseline: 180, stepPct: 0.12, stepDays: 4,
    quotes: [
      "The feed is infinite. Your life isn't.",
      "You've scrolled past a hundred lives today. Go live yours.",
      'They designed it so you never reach the bottom. Stop looking for it.',
    ],
    tips: ['Move social apps off the home screen', 'Phone stays out of the bedroom', 'Set a grayscale display after 9pm'],
    swap: 'Read 5 pages of a book',
  },
  {
    id: 'caffeine', name: 'Excess caffeine', mode: 'wean', unit: 'cups', baseline: 5, stepPct: 0.2, stepDays: 5,
    quotes: ["If you need it to function, it's running you.", 'Borrowed energy always comes back as a crash.'],
    tips: ['No caffeine after 2pm', 'Swap every second cup for water', 'Go half-decaf before cutting a cup'],
    swap: 'Green tea or a glass of water',
  },
  {
    id: 'sugar', name: 'Sugar', mode: 'wean', unit: 'servings', baseline: 4, stepPct: 0.25, stepDays: 5,
    quotes: ['Ten seconds of sweet, three hours of crash.', 'You are building your body out of this. Choose better materials.'],
    tips: ["Don't keep sweets in the house", 'Eat protein first at every meal', 'Fruit when the craving hits'],
    swap: 'A piece of fruit',
  },
  {
    id: 'late-sleep', name: 'Sleeping late', mode: 'wean', unit: 'min past bedtime', baseline: 90, stepPct: 0.2, stepDays: 3,
    quotes: ["Tomorrow's you pays for tonight's 'just five more minutes'. With interest.", 'Nothing worth doing at 2am is worth tomorrow.'],
    tips: ['Screens off 30 minutes before bed', 'Same wake-up time every day, weekends too', 'Dim the lights an hour before bedtime'],
    swap: 'A 10-minute wind-down routine',
  },
  {
    id: 'junk-food', name: 'Junk food', mode: 'wean', unit: 'meals', baseline: 7, stepPct: 0.2, stepDays: 7,
    quotes: ['Cheap food is expensive later.', "Your body keeps receipts for every meal."],
    tips: ['Cook in batches on Sunday', 'Never shop hungry', 'Keep a healthy fallback meal ready'],
    swap: 'A simple home-cooked meal',
  },
  {
    id: 'gaming', name: 'Excess gaming', mode: 'wean', unit: 'minutes', baseline: 150, stepPct: 0.15, stepDays: 4,
    quotes: ['Levelling up a character while your own life sits at level one.', 'Pay for play time with Leisure Coins, not with your goals.'],
    tips: ['Play only after the day\'s commissions are done', 'Set a hard timer before you start', 'Uninstall the one game you lose most hours to'],
    swap: 'Buy a guilt-free leisure hour in the Time Bank',
  },
  {
    id: 'alcohol', name: 'Alcohol', mode: 'wean', unit: 'drinks', baseline: 3, stepPct: 0.25, stepDays: 7,
    quotes: ['Borrowing happiness from tomorrow, always at a loss.', 'The drink keeps nothing it promises.'],
    tips: ['Alternate every drink with water', 'Pick alcohol-free days in advance', 'Have a ready answer for "one more?"'],
    swap: 'A sparkling water with lime',
  },
  {
    id: 'vaping', name: 'Vaping', mode: 'wean', unit: 'sessions', baseline: 12, stepPct: 0.15, stepDays: 4,
    quotes: ["Flavoured doesn't mean harmless. It means marketed.", 'Every puff is practice at needing it.'],
    tips: ['Lower the nicotine strength each step', 'Leave the device in another room', 'Chew gum during the first craving minutes'],
    swap: 'Ten slow deep breaths',
  },
  {
    id: 'impulse-buying', name: 'Impulse buying', mode: 'cold',
    quotes: ['Wanting it and needing it are two different bills.', 'The cart feels good for a minute. The statement lasts a month.'],
    tips: ['48-hour rule: wait two days before any non-essential purchase', 'Remove saved cards from shopping apps', 'Unsubscribe from sale emails'],
    swap: 'Add it to the Life Canvas wishlist instead',
  },
  {
    id: 'snooze', name: 'Snoozing the alarm', mode: 'cold',
    quotes: ['Snoozing is starting the day by losing to yourself.', 'Nine more minutes of worse sleep is not a reward.'],
    tips: ['Put the alarm across the room', 'Open the curtains the moment you stand up', 'Same wake time every day'],
    swap: 'Stand up and drink water immediately',
  },
  {
    id: 'nail-biting', name: 'Nail biting', mode: 'cold',
    quotes: ["Your hands are telling you you're anxious. Listen, don't chew.", 'Notice the urge. Name it. Let it pass.'],
    tips: ['Keep nails trimmed short', 'Fidget toy in your pocket', 'Notice which situations trigger it'],
    swap: 'Press your fingertips together for 10 seconds',
  },
  {
    id: 'skipping-meals', name: 'Skipping meals', mode: 'cold',
    quotes: ["Running on empty isn't discipline. It's damage.", "You can't out-work a body you don't fuel."],
    tips: ['Set meal reminders', 'Keep a healthy snack at your desk', 'Prep tomorrow\'s lunch tonight'],
    swap: 'A 5-minute healthy snack',
  },
  {
    id: 'procrastination', name: 'Procrastinating', mode: 'cold',
    quotes: ['Later is where good intentions go to die.', 'You already know what to do. Do the first two minutes.'],
    tips: ['Two-minute rule: just start', 'Break the task into one tiny commission', 'Phone in another room for 25 minutes'],
    swap: 'A 25-minute focus block',
  },
];

export const GENERIC_QUOTES = [
  "The person you want to be doesn't do this. Act like them for the next ten minutes.",
  'Every slip is data, not a verdict. Start again right now.',
  'Discipline is choosing what you want most over what you want now.',
];

export const libById = (id?: string) => LIBRARY.find((l) => l.id === id);
export const quotesFor = (libId?: string) => libById(libId)?.quotes ?? GENERIC_QUOTES;
export const pickQuote = (libId?: string, seed = Date.now()) => { const q = quotesFor(libId); return q[Math.floor(seed / 1000) % q.length]; };

export const TRIGGERS = ['Stress', 'Boredom', 'Tired', 'Social', 'Habit loop', 'Other'];
