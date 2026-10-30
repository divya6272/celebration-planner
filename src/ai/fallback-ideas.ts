import type { EventInput, EventType, IdeaSet } from '../planner/types.js';

/**
 * Curated ideas used when the AI is unavailable (no key, timeout, bad output). They are static
 * but still tailored to event type, theme and dietary choice, so the app never shows an empty
 * "ideas" section.
 */

type BaseIdeas = Omit<IdeaSet, 'headline'> & { headline: (theme: string | undefined) => string };

const BASE: Record<EventType, BaseIdeas> = {
  wedding: {
    headline: (theme) =>
      theme ? `A ${theme} wedding that feels personal` : 'A wedding that feels unmistakably yours',
    themeIdeas: [
      {
        title: 'Garden golden hour',
        description: 'Outdoor ceremony timed for soft evening light, with warm string lights.',
      },
      {
        title: 'Heritage & heirlooms',
        description: 'Family textiles, brass lamps and handwritten signage tell your story.',
      },
      {
        title: 'Modern minimal',
        description: 'One statement floral installation, clean typography and a neutral palette.',
      },
    ],
    decorIdeas: [
      'Reuse ceremony florals as reception centrepieces',
      'Seasonal local flowers over imported blooms',
      'A single hero photo backdrop instead of decor everywhere',
      'Candles and fairy lights for warmth at low cost',
    ],
    menuIdeas: [
      'A regional signature dish from each family',
      'Live counters for variety without wasting food',
      'A mocktail bar with two house specials',
      'A dessert table instead of one large cake',
    ],
    activityIdeas: [
      'A welcome video of messages from loved ones',
      'A guest memory book with instant prints',
      'A short toast schedule so speeches stay lively',
      'A late-evening dance floor with a surprise playlist section',
    ],
    savingTips: [
      'Choose an off-peak day or a weekday for better venue rates',
      'Send digital invitations with an RSVP link',
      'Confirm final headcount as late as the caterer allows',
      'Keep the contingency fund untouched until the last week',
    ],
  },
  birthday: {
    headline: (theme) =>
      theme
        ? `A ${theme} party everyone will talk about`
        : 'A birthday built around the guest of honour',
    themeIdeas: [
      {
        title: 'Colour-pop carnival',
        description: 'Bright palette, simple games and a photo corner.',
      },
      {
        title: 'Cinema night',
        description: 'A projector, popcorn bar and favourite films for a cosy crowd.',
      },
      { title: 'Adventure day', description: 'Treasure hunt or outdoor games with small prizes.' },
    ],
    decorIdeas: [
      'One bold balloon arch as the photo backdrop',
      'Hand-drawn name banner by friends and family',
      'Table runners in two palette colours',
      'A "memory lane" photo string across one wall',
    ],
    menuIdeas: [
      'Build-your-own sliders, tacos or chaat station',
      'Fruit skewers and a juice bar for lighter options',
      'Mini desserts alongside a small custom cake',
      'Clearly labelled allergen-friendly snacks',
    ],
    activityIdeas: [
      'Two well-run group games instead of a long schedule',
      'A scavenger hunt with themed clues',
      'A karaoke or dance-off corner',
      'A guest-signed card or time capsule',
    ],
    savingTips: [
      'Host at home or a free community space',
      'Bake or order a smaller cake and add sheet-cake slices',
      'Use digital invitations',
      'Give one useful, low-cost return gift per guest',
    ],
  },
  community: {
    headline: (theme) =>
      theme
        ? `A ${theme} gathering that brings the neighbourhood together`
        : 'A community event people want to return to',
    themeIdeas: [
      {
        title: 'Neighbourhood fair',
        description: 'Local stalls, performances and a children’s corner in one shared space.',
      },
      {
        title: 'Culture night',
        description: 'Music, dance and food from the communities that live nearby.',
      },
      {
        title: 'Clean-up and celebrate',
        description: 'A short service activity followed by a shared meal.',
      },
    ],
    decorIdeas: [
      'Clear welcome signage and wayfinding at every entrance',
      'Community-made banners or art installations',
      'Bunting and lanterns that can be reused next year',
      'A "what\'s on today" board with the run of show',
    ],
    menuIdeas: [
      'A potluck table with labelled dishes',
      'Local food vendors with one shared seating area',
      'Water and tea or coffee stations that stay free',
      'A simple vegetarian main that suits everyone',
    ],
    activityIdeas: [
      'A short opening with the organisers and local leaders',
      'Open-mic or local performers every 30 minutes',
      'A kids’ corner with volunteer-run games',
      'A feedback wall to plan the next event',
    ],
    savingTips: [
      'Ask the venue about non-profit or community fee waivers',
      'Seek in-kind sponsors such as printing, sound or food',
      'Recruit volunteers early and give them clear roles',
      'Use free local channels to promote instead of paid ads',
    ],
  },
};

export function buildFallbackIdeas(input: EventInput): IdeaSet {
  const base = BASE[input.eventType];
  const menuIdeas = input.vegetarianOnly
    ? [
        'An all-vegetarian menu with clearly marked vegan and Jain options',
        ...base.menuIdeas.slice(0, 3),
      ]
    : base.menuIdeas;

  const savingTips = input.accessibilityNeeds
    ? [
        'Choose a step-free venue first; it avoids costly ramps and rentals later',
        ...base.savingTips.slice(0, 3),
      ]
    : base.savingTips;

  return {
    headline: base.headline(input.theme),
    themeIdeas: base.themeIdeas,
    decorIdeas: base.decorIdeas,
    menuIdeas,
    activityIdeas: base.activityIdeas,
    savingTips,
  };
}
