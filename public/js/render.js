import { h, mount } from './dom.js';
import { formatDate, formatMoney, plural } from './format.js';

const PHASE_ORDER = ['Plan & book', 'Lock in details', 'Final countdown', 'Event day'];

export function renderWarnings(container, warnings) {
  container.hidden = warnings.length === 0;
  mount(container, ...warnings.map((text) => h('p', {}, text)));
}

export function renderOverview(container, summary) {
  const stat = (label, value) =>
    h('div', { class: 'stat' }, h('dt', {}, label), h('dd', {}, value));

  const where = [summary.city, summary.theme].filter(Boolean).join(' · ');
  mount(
    container,
    h(
      'p',
      { class: 'overview-line' },
      `${summary.eventLabel} · ${formatDate(summary.eventDate)}`,
      where ? ` · ${where}` : '',
    ),
    h(
      'dl',
      { class: 'stat-grid' },
      stat('Total budget', formatMoney(summary.totalBudget, summary.currency)),
      stat('Per guest', formatMoney(summary.perGuest, summary.currency)),
      stat('Guests', String(summary.guestCount)),
      stat(
        'Time to go',
        summary.daysUntilEvent === 0 ? 'Today' : plural(summary.daysUntilEvent, 'day'),
      ),
    ),
  );
}

export function renderBudget(container, plan) {
  const { currency, totalBudget } = plan.summary;

  const rows = plan.budget.map((line) =>
    h(
      'tr',
      {},
      h(
        'th',
        { scope: 'row' },
        h('span', { class: 'cat-name' }, line.label),
        line.isPriority ? h('span', { class: 'badge' }, 'Your priority') : null,
        h('span', { class: 'cat-tip' }, line.tip),
      ),
      h(
        'td',
        { class: 'share' },
        h(
          'meter',
          { min: 0, max: 100, value: line.percent, 'aria-label': `${line.label} share of budget` },
          `${line.percent}%`,
        ),
        h('span', { class: 'pct' }, `${line.percent}%`),
      ),
      h('td', { class: 'amount' }, formatMoney(line.amount, currency)),
    ),
  );

  mount(
    container,
    h(
      'div',
      { class: 'table-wrap' },
      h(
        'table',
        { class: 'budget-table' },
        h(
          'caption',
          { class: 'visually-hidden' },
          `How ${formatMoney(totalBudget, currency)} is split across categories`,
        ),
        h(
          'thead',
          {},
          h(
            'tr',
            {},
            h('th', { scope: 'col' }, 'Category'),
            h('th', { scope: 'col' }, 'Share'),
            h('th', { scope: 'col', class: 'amount' }, 'Amount'),
          ),
        ),
        h('tbody', {}, ...rows),
        h(
          'tfoot',
          {},
          h(
            'tr',
            {},
            h('th', { scope: 'row' }, 'Total'),
            h('td', {}, '100%'),
            h('td', { class: 'amount' }, formatMoney(totalBudget, currency)),
          ),
        ),
      ),
    ),
  );
}

/** Builds a labelled checkbox row. */
function checkItem({ id, checked, onChange }, ...content) {
  const input = h('input', { type: 'checkbox', id, checked });
  input.addEventListener('change', () => onChange(input.checked));
  return h(
    'li',
    { class: 'check-item' },
    h('label', { for: id }, input, h('span', { class: 'check-text' }, ...content)),
  );
}

export function renderTimeline(container, plan, checked, onToggle) {
  const total = plan.timeline.length;
  const progress = h('progress', { max: total, value: 0, 'aria-labelledby': 'progress-label' });
  const progressLabel = h('span', { id: 'progress-label' });

  const updateProgress = () => {
    const done = container.querySelectorAll('input[type="checkbox"]:checked').length;
    progress.value = done;
    progressLabel.textContent = `${done} of ${total} steps done`;
  };

  const groups = PHASE_ORDER.map((phase) => {
    const items = plan.timeline.filter((m) => m.phase === phase);
    if (items.length === 0) return null;
    return h(
      'section',
      { class: 'phase', 'aria-label': phase },
      h('h4', {}, phase),
      h(
        'ol',
        { class: 'checklist' },
        ...items.map((m) =>
          checkItem(
            {
              id: `ms-${m.id}`,
              checked: checked.has(`ms-${m.id}`),
              onChange: (value) => {
                onToggle(`ms-${m.id}`, value);
                updateProgress();
              },
            },
            h('span', { class: 'due' }, formatDate(m.dueDate)),
            h('span', {}, m.title),
          ),
        ),
      ),
    );
  });

  mount(container, h('div', { class: 'progress' }, progressLabel, progress), ...groups);
  updateProgress();
}

export function renderVendors(container, plan, checked, onToggle) {
  const { currency } = plan.summary;

  mount(
    container,
    ...plan.vendors.map((vendor) =>
      h(
        'details',
        { class: 'vendor' },
        h(
          'summary',
          {},
          h('span', { class: 'vendor-name' }, vendor.vendor),
          h('span', { class: 'vendor-budget' }, formatMoney(vendor.budget, currency)),
        ),
        h('h4', {}, 'To do'),
        h(
          'ul',
          { class: 'checklist' },
          ...vendor.tasks.map((task, i) => {
            const id = `vt-${vendor.categoryId}-${i}`;
            return checkItem(
              { id, checked: checked.has(id), onChange: (value) => onToggle(id, value) },
              task,
            );
          }),
        ),
        vendor.questions.length > 0 ? h('h4', {}, 'Questions to ask') : null,
        vendor.questions.length > 0
          ? h('ul', { class: 'questions' }, ...vendor.questions.map((q) => h('li', {}, q)))
          : null,
      ),
    ),
  );
}

const bulletList = (title, items) =>
  h(
    'section',
    { class: 'idea-block' },
    h('h4', {}, title),
    h('ul', {}, ...items.map((item) => h('li', {}, item))),
  );

export function renderIdeasLoading(container) {
  mount(container, h('p', { class: 'loading' }, 'Thinking up ideas for your event…'));
}

export function renderIdeas(container, result) {
  const { ideas, source, provider } = result;
  const badge =
    source === 'ai'
      ? `Generated with ${provider ?? 'AI'} for your event`
      : 'Curated suggestions (AI ideas are unavailable right now)';

  mount(
    container,
    h('p', { class: 'ideas-headline' }, ideas.headline),
    h('p', { class: `source source-${source}` }, badge),
    h(
      'div',
      { class: 'theme-grid' },
      ...ideas.themeIdeas.map((t) =>
        h('article', { class: 'theme-card' }, h('h4', {}, t.title), h('p', {}, t.description)),
      ),
    ),
    h(
      'div',
      { class: 'idea-grid' },
      bulletList('Decor', ideas.decorIdeas),
      bulletList('Menu', ideas.menuIdeas),
      bulletList('Activities', ideas.activityIdeas),
      bulletList('Ways to save', ideas.savingTips),
    ),
  );
}

export function renderIdeasError(container) {
  mount(
    container,
    h(
      'p',
      { class: 'notice' },
      'We could not load ideas this time. Your plan above is still complete.',
    ),
  );
}
