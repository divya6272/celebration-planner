import type { EventType, FocusArea } from './types.js';

/**
 * Planning knowledge for each event type, kept as data so the engine stays small and new event
 * types can be added without touching any logic.
 */

export interface CategoryTemplate {
  id: string;
  label: string;
  /** Relative share of the budget. Weights per event type sum to 1. */
  weight: number;
  /** Which host priority boosts this category, if any. */
  focus?: FocusArea;
  tip: string;
  /** Vendor to book for this category. Absent for categories with nothing to book. */
  vendor?: string;
  tasks?: string[];
  questions?: string[];
}

export interface MilestoneTemplate {
  id: string;
  title: string;
  /** Days before the event at the ideal (unhurried) pace. */
  daysBefore: number;
  categoryId?: string;
}

export interface EventTemplate {
  label: string;
  categories: CategoryTemplate[];
  milestones: MilestoneTemplate[];
}

const CONTINGENCY = (weight: number): CategoryTemplate => ({
  id: 'contingency',
  label: 'Contingency buffer',
  weight,
  tip: 'Untouchable until needed. Overruns and last-minute changes are normal, so plan for them.',
});

const wedding: EventTemplate = {
  label: 'Wedding',
  categories: [
    {
      id: 'venue',
      label: 'Venue & rentals',
      weight: 0.22,
      focus: 'venue',
      tip: 'Book first: the venue fixes your date, capacity and often your caterer options.',
      vendor: 'Venue',
      tasks: [
        'Visit your top 3 venues at the time of day of the event',
        'Confirm capacity, power backup, parking and rain plan',
        'Get the contract and cancellation terms in writing',
      ],
      questions: [
        'What is included (tables, chairs, lighting, cleaning)?',
        'Are outside caterers and decorators allowed, and is there a fee?',
        'What are the noise and end-time restrictions?',
      ],
    },
    {
      id: 'catering',
      label: 'Catering & beverages',
      weight: 0.28,
      focus: 'food',
      tip: 'The largest controllable cost: negotiate per-plate pricing and confirm counts late.',
      vendor: 'Caterer',
      tasks: [
        'Shortlist 3 caterers and attend a tasting',
        'Fix the menu, live counters and service staff ratio',
        'Confirm final headcount 2 weeks before',
      ],
      questions: [
        'What is the per-plate price and what does it include?',
        'How are leftovers, overtime and extra guests charged?',
        'Can you cover allergies and dietary needs?',
      ],
    },
    {
      id: 'decor',
      label: 'Decor & florals',
      weight: 0.12,
      focus: 'decor',
      tip: 'Reuse ceremony flowers at the reception and favour seasonal blooms to save.',
      vendor: 'Decorator / florist',
      tasks: [
        'Share a mood board and venue photos with the decorator',
        'Agree on setup and teardown times',
        'Approve a sample or mock-up of the stage and entrance',
      ],
      questions: [
        'Which elements are rented and which are purchased?',
        'Who handles setup, teardown and any damage?',
      ],
    },
    {
      id: 'photography',
      label: 'Photography & video',
      weight: 0.09,
      focus: 'memories',
      tip: 'Prioritise one great photographer over many add-ons; ask for a shot list delivery date.',
      vendor: 'Photographer / videographer',
      tasks: [
        'Review full galleries, not just highlight reels',
        'Prepare a must-have shot list and family group list',
        'Agree on delivery timeline and raw-file ownership',
      ],
      questions: [
        'How many hours and photographers are covered?',
        'When will edited photos and video be delivered?',
      ],
    },
    {
      id: 'attire',
      label: 'Attire, beauty & styling',
      weight: 0.08,
      tip: 'Start fittings early; rentals and alterations cost far less than last-minute buys.',
      vendor: 'Attire & beauty',
      tasks: [
        'Book outfit fittings and a hair and makeup trial',
        'Schedule final fittings one week before',
      ],
      questions: ['What is the alteration timeline and rush fee?'],
    },
    {
      id: 'entertainment',
      label: 'Music & entertainment',
      weight: 0.06,
      focus: 'entertainment',
      tip: 'A good emcee and a playlist you approve beat an expensive act nobody asked for.',
      vendor: 'DJ / band / emcee',
      tasks: [
        'Share a do-play and do-not-play list',
        'Confirm sound check time and equipment requirements',
      ],
      questions: ['How long is the set, and what is the overtime rate?'],
    },
    {
      id: 'invitations',
      label: 'Invitations & stationery',
      weight: 0.02,
      tip: 'Digital invitations with an RSVP link save money and give you reliable headcounts.',
      vendor: 'Stationer / designer',
      tasks: ['Proof-read names, dates and venue address twice', 'Track RSVPs in one shared sheet'],
      questions: ['What is the turnaround time for print or digital proofs?'],
    },
    {
      id: 'transport',
      label: 'Transport & stay',
      weight: 0.03,
      tip: 'Group out-of-town guests in one hotel block and run a single shuttle loop.',
      vendor: 'Transport & accommodation',
      tasks: [
        'Book a room block for out-of-town guests',
        'Arrange a shuttle or cars for key family',
      ],
      questions: ['What is the cancellation policy for room blocks and vehicles?'],
    },
    CONTINGENCY(0.1),
  ],
  milestones: [
    { id: 'w-plan', title: 'Lock budget, guest list and must-haves', daysBefore: 240 },
    {
      id: 'w-venue',
      title: 'Book the venue and fix the date',
      daysBefore: 210,
      categoryId: 'venue',
    },
    {
      id: 'w-photo',
      title: 'Book photographer and videographer',
      daysBefore: 180,
      categoryId: 'photography',
    },
    {
      id: 'w-caterer',
      title: 'Shortlist caterers and attend tastings',
      daysBefore: 165,
      categoryId: 'catering',
    },
    {
      id: 'w-decor',
      title: 'Book decorator and finalise the theme',
      daysBefore: 150,
      categoryId: 'decor',
    },
    {
      id: 'w-music',
      title: 'Book DJ, band or emcee',
      daysBefore: 120,
      categoryId: 'entertainment',
    },
    {
      id: 'w-attire',
      title: 'Choose outfits and book fittings',
      daysBefore: 100,
      categoryId: 'attire',
    },
    {
      id: 'w-invites',
      title: 'Send invitations and open RSVPs',
      daysBefore: 75,
      categoryId: 'invitations',
    },
    {
      id: 'w-transport',
      title: 'Arrange guest transport and accommodation',
      daysBefore: 45,
      categoryId: 'transport',
    },
    {
      id: 'w-menu',
      title: 'Finalise menu, headcount and seating',
      daysBefore: 30,
      categoryId: 'catering',
    },
    {
      id: 'w-confirm',
      title: 'Confirm every vendor in writing and share the day-of schedule',
      daysBefore: 14,
    },
    {
      id: 'w-payments',
      title: 'Final fittings, final payments and an emergency kit',
      daysBefore: 7,
    },
    { id: 'w-rehearsal', title: 'Rehearsal and vendor drop-offs', daysBefore: 1 },
    {
      id: 'w-day',
      title: 'Wedding day: hand coordination to a trusted point person',
      daysBefore: 0,
    },
  ],
};

const birthday: EventTemplate = {
  label: 'Birthday party',
  categories: [
    {
      id: 'venue',
      label: 'Venue or home setup',
      weight: 0.2,
      focus: 'venue',
      tip: 'Hosting at home or a free community hall can free up budget for food and fun.',
      vendor: 'Venue',
      tasks: [
        'Confirm the booking, capacity and allowed hours',
        'Ask about decoration rules (balloons, tape, candles)',
      ],
      questions: [
        'Is there a minimum spend or a cleaning fee?',
        'Can we bring our own cake and food?',
      ],
    },
    {
      id: 'catering',
      label: 'Food & drinks',
      weight: 0.28,
      focus: 'food',
      tip: 'Plan food for roughly 90% of RSVPs and one extra round of snacks for kids.',
      vendor: 'Caterer / food supplier',
      tasks: ['Fix the menu by age group and dietary needs', 'Confirm delivery or pickup time'],
      questions: ['Is there a minimum order?', 'Can you label allergens clearly?'],
    },
    {
      id: 'cake',
      label: 'Cake & desserts',
      weight: 0.07,
      tip: 'A smaller custom cake plus sheet-cake slices serves many guests for less.',
      vendor: 'Baker',
      tasks: [
        'Order the cake with flavour, size and inscription',
        'Plan pickup and a cool storage spot',
      ],
      questions: [
        'What is the lead time for custom designs?',
        'Is an eggless or sugar-free option available?',
      ],
    },
    {
      id: 'decor',
      label: 'Decor & balloons',
      weight: 0.14,
      focus: 'decor',
      tip: 'One bold backdrop for photos beats scattered decor everywhere.',
      vendor: 'Decorator',
      tasks: [
        'Pick a colour palette and one photo backdrop',
        'Schedule setup at least 2 hours early',
      ],
      questions: ['Is setup and cleanup included?'],
    },
    {
      id: 'entertainment',
      label: 'Games & entertainment',
      weight: 0.12,
      focus: 'entertainment',
      tip: 'Match activities to the guest of honour; two well-run games outperform a long schedule.',
      vendor: 'Entertainer / activity host',
      tasks: ['Plan a 90-minute run of show', 'Prepare a rainy-day or indoor backup'],
      questions: ['What age range is the activity designed for?', 'What equipment do you bring?'],
    },
    {
      id: 'photography',
      label: 'Photos & keepsakes',
      weight: 0.05,
      focus: 'memories',
      tip: 'Nominate a friend with a good phone and set up a shared album link.',
      vendor: 'Photographer',
      tasks: ['Create a shared album for guests', 'Decide on 3 must-have photo moments'],
      questions: ['Are edited photos delivered within a week?'],
    },
    {
      id: 'invitations',
      label: 'Invitations',
      weight: 0.02,
      tip: 'Use a digital invite with an RSVP date so you can lock counts early.',
      vendor: 'Invitation designer',
      tasks: ['Send invitations with date, time, address and RSVP deadline'],
      questions: [],
    },
    {
      id: 'favors',
      label: 'Return gifts & favours',
      weight: 0.04,
      tip: 'One useful, low-cost favour per guest is plenty.',
      vendor: 'Favour supplier',
      tasks: ['Order favours with a few spares', 'Pack them the day before'],
      questions: ['What is the bulk discount threshold?'],
    },
    CONTINGENCY(0.08),
  ],
  milestones: [
    { id: 'b-plan', title: 'Set budget, guest list and theme', daysBefore: 60 },
    {
      id: 'b-venue',
      title: 'Book the venue or confirm the home setup',
      daysBefore: 45,
      categoryId: 'venue',
    },
    {
      id: 'b-fun',
      title: 'Book entertainment or plan the activities',
      daysBefore: 35,
      categoryId: 'entertainment',
    },
    {
      id: 'b-invites',
      title: 'Send invitations and track RSVPs',
      daysBefore: 30,
      categoryId: 'invitations',
    },
    {
      id: 'b-food',
      title: 'Book the caterer or plan the menu',
      daysBefore: 28,
      categoryId: 'catering',
    },
    { id: 'b-cake', title: 'Order the cake', daysBefore: 21, categoryId: 'cake' },
    { id: 'b-decor', title: 'Order decor and party favours', daysBefore: 21, categoryId: 'decor' },
    { id: 'b-rsvp', title: 'Confirm RSVPs and final headcount', daysBefore: 14 },
    { id: 'b-confirm', title: 'Confirm vendors, delivery times and helpers', daysBefore: 7 },
    { id: 'b-prep', title: 'Collect cake, pack favours and prepare the playlist', daysBefore: 2 },
    { id: 'b-day', title: 'Party day: set up early and enjoy it', daysBefore: 0 },
  ],
};

const community: EventTemplate = {
  label: 'Community event',
  categories: [
    {
      id: 'venue',
      label: 'Venue & space',
      weight: 0.18,
      focus: 'venue',
      tip: 'Public halls, schools and parks often waive fees for non-profit community use.',
      vendor: 'Venue / site owner',
      tasks: [
        'Get written permission from the venue or local authority',
        'Walk the site to plan entrances, queues and toilets',
      ],
      questions: [
        'Are there fee waivers for community or non-profit events?',
        'What is the maximum capacity?',
      ],
    },
    {
      id: 'catering',
      label: 'Food & refreshments',
      weight: 0.25,
      focus: 'food',
      tip: 'Mix a caterer for mains with potluck or sponsor-donated snacks to stretch the budget.',
      vendor: 'Caterer / food vendors',
      tasks: ['Confirm food-safety licences for vendors', 'Plan drinking water points'],
      questions: [
        'Do you hold current food-safety certification?',
        'Can you scale numbers up or down at short notice?',
      ],
    },
    {
      id: 'av',
      label: 'Sound, stage & equipment',
      weight: 0.15,
      focus: 'entertainment',
      tip: 'Rent only what the programme needs and test it all the day before.',
      vendor: 'Sound, lighting & equipment hire',
      tasks: [
        'List every microphone, speaker, projector and extension lead needed',
        'Book a sound check',
      ],
      questions: ['Is a technician included for the whole event?', 'Is there a power backup?'],
    },
    {
      id: 'decor',
      label: 'Decor & signage',
      weight: 0.08,
      focus: 'decor',
      tip: 'Clear signage and wayfinding matter more than decoration.',
      vendor: 'Printer / decorator',
      tasks: ['Order banners, directional signs and name tags', 'Plan a registration desk'],
      questions: ['What is the print turnaround time?'],
    },
    {
      id: 'entertainment',
      label: 'Programme & performers',
      weight: 0.1,
      focus: 'entertainment',
      tip: 'Invite local talent: it costs less and brings its own audience.',
      vendor: 'Performers / speakers',
      tasks: ['Fix a run of show with time buffers', 'Brief performers on stage and timing rules'],
      questions: ['Are fees or travel costs expected?', 'What are your technical requirements?'],
    },
    {
      id: 'permits',
      label: 'Permits, insurance & safety',
      weight: 0.06,
      tip: 'Check early: some permits take weeks. Include first aid and a safety lead.',
      vendor: 'Local authority / insurer',
      tasks: [
        'Check permits for gatherings, music, food and road closures',
        'Arrange public-liability insurance if required',
        'Appoint a first-aid and safety lead',
      ],
      questions: [
        'What is the lead time for each permit?',
        'Does the venue insurance cover our activities?',
      ],
    },
    {
      id: 'marketing',
      label: 'Promotion & outreach',
      weight: 0.08,
      tip: 'Local groups, schools and community WhatsApp channels outperform paid ads.',
      vendor: 'Printer / local media',
      tasks: [
        'Create a one-page poster and a shareable invite',
        'Contact local groups and partners',
      ],
      questions: [],
    },
    {
      id: 'volunteers',
      label: 'Volunteers & logistics',
      weight: 0.05,
      tip: 'Feed and thank your volunteers; it keeps them coming back.',
      tasks: ['Recruit volunteers with named roles and shifts', 'Hold a briefing before the event'],
      questions: [],
    },
    CONTINGENCY(0.05),
  ],
  milestones: [
    { id: 'c-plan', title: 'Define purpose, goals and a small organising team', daysBefore: 120 },
    {
      id: 'c-permits',
      title: 'Check permits, insurance and venue permission',
      daysBefore: 100,
      categoryId: 'permits',
    },
    { id: 'c-venue', title: 'Book the venue', daysBefore: 90, categoryId: 'venue' },
    {
      id: 'c-volunteers',
      title: 'Recruit volunteers and assign roles',
      daysBefore: 75,
      categoryId: 'volunteers',
    },
    { id: 'c-av', title: 'Book sound, stage and equipment', daysBefore: 60, categoryId: 'av' },
    {
      id: 'c-programme',
      title: 'Confirm speakers and performers',
      daysBefore: 50,
      categoryId: 'entertainment',
    },
    {
      id: 'c-promo',
      title: 'Launch promotion: posters, social and local groups',
      daysBefore: 45,
      categoryId: 'marketing',
    },
    {
      id: 'c-food',
      title: 'Arrange caterer, vendors or potluck plan',
      daysBefore: 30,
      categoryId: 'catering',
    },
    { id: 'c-runofshow', title: 'Finalise run of show and brief volunteers', daysBefore: 21 },
    { id: 'c-access', title: 'Confirm accessibility, safety and first-aid plans', daysBefore: 14 },
    { id: 'c-lastcall', title: 'Last-call promotion and a weather or backup plan', daysBefore: 7 },
    { id: 'c-setup', title: 'Set up and run an equipment check', daysBefore: 1 },
    {
      id: 'c-day',
      title: 'Event day: open doors early and keep to the run of show',
      daysBefore: 0,
    },
  ],
};

export const TEMPLATES: Record<EventType, EventTemplate> = { wedding, birthday, community };

/** Extra vendor questions added when the host has accessibility or dietary needs. */
export const ACCESSIBILITY_QUESTIONS: Record<string, string> = {
  venue: 'Is there step-free access, accessible toilets and reserved seating near exits?',
  transport: 'Do you offer wheelchair-accessible vehicles?',
  av: 'Can you provide a hearing loop, captions or a sign-language interpreter position?',
  entertainment:
    'Can the programme be followed by guests with limited hearing, vision or mobility?',
};

export const VEGETARIAN_QUESTION =
  'Can the entire menu be vegetarian, with vegan and Jain options clearly labelled?';
