// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, postJson } from '../public/js/api.js';
import { h } from '../public/js/dom.js';
import { addDays, formatDate, formatMoney, localIsoDate, plural } from '../public/js/format.js';
import {
  renderBudget,
  renderIdeas,
  renderOverview,
  renderTimeline,
  renderVendors,
  renderWarnings,
} from '../public/js/render.js';
import { loadChecked, saveChecked } from '../public/js/storage.js';
import { buildPlan } from '../src/planner/plan.js';
import { buildFallbackIdeas } from '../src/ai/fallback-ideas.js';
import { TODAY, makeInput } from './fixtures.js';

const plan = buildPlan(makeInput({ priorities: ['food'], city: 'Jaipur' }), TODAY);

describe('format helpers', () => {
  it('formats money and dates', () => {
    expect(formatMoney(1_500_000, 'INR')).toBe('₹15,00,000');
    expect(formatMoney(2500, 'USD')).toBe('$2,500');
    expect(formatDate('2027-03-01')).toBe('1 Mar 2027');
  });
  it('pluralises and builds local dates', () => {
    expect(plural(1, 'day')).toBe('1 day');
    expect(plural(5, 'day')).toBe('5 days');
    expect(localIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(localIsoDate(addDays(new Date(2026, 0, 30), 3))).toBe('2026-02-02');
  });
});

describe('h()', () => {
  it('treats strings as text, never as markup', () => {
    const el = h('p', {}, '<img src=x onerror=alert(1)>');
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toBe('<img src=x onerror=alert(1)>');
  });
  it('skips empty attributes and sets boolean ones', () => {
    const el = h('input', { type: 'checkbox', checked: true, disabled: false, title: null });
    expect(el.hasAttribute('checked')).toBe(true);
    expect(el.hasAttribute('disabled')).toBe(false);
    expect(el.hasAttribute('title')).toBe(false);
  });
});

describe('render', () => {
  let box: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = '<div id="box"></div>';
    box = document.getElementById('box') as HTMLElement;
  });

  it('shows warnings only when there are some', () => {
    renderWarnings(box, []);
    expect(box.hidden).toBe(true);
    renderWarnings(box, ['Heads up']);
    expect(box.hidden).toBe(false);
    expect(box.textContent).toContain('Heads up');
  });

  it('renders the overview stats as a definition list', () => {
    renderOverview(box, plan.summary);
    expect(box.querySelectorAll('dt')).toHaveLength(4);
    expect(box.textContent).toContain('₹15,00,000');
    expect(box.textContent).toContain('Jaipur');
  });

  it('renders an accessible budget table with a row per category and a total', () => {
    renderBudget(box, plan);
    const table = box.querySelector('table') as HTMLTableElement;
    expect(table.querySelector('caption')).not.toBeNull();
    expect(table.querySelectorAll('tbody tr')).toHaveLength(plan.budget.length);
    expect(table.querySelectorAll('th[scope="col"]').length).toBe(3);
    expect(box.querySelectorAll('meter').length).toBe(plan.budget.length);
    expect(box.textContent).toContain('Your priority');
  });

  it('renders timeline checkboxes, restores ticked state and updates progress', () => {
    const onToggle = vi.fn();
    const firstId = `ms-${plan.timeline[0]?.id}`;
    renderTimeline(box, plan, new Set([firstId]), onToggle);

    const boxes = box.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    expect(boxes).toHaveLength(plan.timeline.length);
    expect((document.getElementById(firstId) as HTMLInputElement).checked).toBe(true);
    expect(box.textContent).toContain(`1 of ${plan.timeline.length} steps done`);

    const second = boxes[1] as HTMLInputElement;
    second.click();
    expect(onToggle).toHaveBeenCalledWith(second.id, true);
    expect(box.textContent).toContain(`2 of ${plan.timeline.length} steps done`);
    // every checkbox has a label for assistive tech
    for (const input of boxes) expect(box.querySelector(`label[for="${input.id}"]`)).not.toBeNull();
  });

  it('renders vendor checklists with budgets and questions', () => {
    renderVendors(box, plan, new Set(), vi.fn());
    expect(box.querySelectorAll('details')).toHaveLength(plan.vendors.length);
    expect(box.textContent).toContain('Questions to ask');
  });

  it('renders ideas and labels their source honestly', () => {
    const ideas = buildFallbackIdeas(makeInput());
    renderIdeas(box, { source: 'fallback', ideas });
    expect(box.textContent).toContain('Curated suggestions');
    renderIdeas(box, { source: 'ai', provider: 'Groq', ideas });
    expect(box.textContent).toContain('Generated with Groq');
  });

  it('cannot be used for XSS through AI or plan text', () => {
    const evil = '<img src=x onerror="window.pwned=1">';
    const ideas = { ...buildFallbackIdeas(makeInput()), headline: evil, decorIdeas: [evil] };
    renderIdeas(box, { source: 'ai', provider: 'Groq', ideas });
    renderBudget(box, {
      ...plan,
      budget: plan.budget.map((l) => ({ ...l, label: evil, tip: evil })),
    });
    expect(box.querySelector('img')).toBeNull();
  });
});

describe('storage', () => {
  it('round-trips ticked items and tolerates corrupt data', () => {
    saveChecked('k', new Set(['a', 'b']));
    expect([...loadChecked('k')].sort()).toEqual(['a', 'b']);
    localStorage.setItem('bad', '{not json');
    expect(loadChecked('bad').size).toBe(0);
    localStorage.setItem('num', '[1,"x"]');
    expect([...loadChecked('num')]).toEqual(['x']);
  });

  it('does not throw when storage is unavailable', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => saveChecked('k', new Set(['a']))).not.toThrow();
    spy.mockRestore();
  });
});

describe('postJson', () => {
  const mockFetch = (impl: () => Promise<unknown>) => vi.stubGlobal('fetch', vi.fn(impl));

  it('returns parsed JSON on success', async () => {
    mockFetch(async () => ({ ok: true, status: 200, json: async () => ({ a: 1 }) }));
    expect(await postJson('/x', {})).toEqual({ a: 1 });
  });

  it('surfaces validation issues', async () => {
    mockFetch(async () => ({
      ok: false,
      status: 400,
      json: async () => ({ issues: [{ field: 'guestCount', message: 'At least 1 guest' }] }),
    }));
    const error = await postJson('/x', {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).issues[0]?.field).toBe('guestCount');
  });

  it('gives friendly messages for rate limits and network failures', async () => {
    mockFetch(async () => ({ ok: false, status: 429, json: async () => ({}) }));
    await expect(postJson('/x', {})).rejects.toThrow(/Too many requests/);
    mockFetch(async () => {
      throw new TypeError('network');
    });
    await expect(postJson('/x', {})).rejects.toThrow(/Could not reach the server/);
  });

  it('handles non-JSON error bodies', async () => {
    mockFetch(async () => ({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError('bad');
      },
    }));
    await expect(postJson('/x', {})).rejects.toBeInstanceOf(ApiError);
  });
});
