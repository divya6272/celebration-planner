import { ApiError, postJson } from './api.js';
import { addDays, localIsoDate } from './format.js';
import {
  renderBudget,
  renderIdeas,
  renderIdeasError,
  renderIdeasLoading,
  renderOverview,
  renderTimeline,
  renderVendors,
  renderWarnings,
} from './render.js';
import { loadChecked, saveChecked } from './storage.js';

const MAX_PRIORITIES = 3;
const $ = (selector) => document.querySelector(selector);

const form = $('#planner-form');
const errorSummary = $('#form-errors');
const results = $('#results');
const status = $('#status');
const submitBtn = $('#submit-btn');
const notes = $('#notes');

/** Request counter: a slow response from an older submit must never overwrite a newer plan. */
let latestRequest = 0;

function readForm() {
  const data = new FormData(form);
  const number = (name) => {
    const raw = String(data.get(name) ?? '').trim();
    return raw === '' ? undefined : Number(raw);
  };
  return {
    eventType: data.get('eventType'),
    guestCount: number('guestCount'),
    totalBudget: number('totalBudget'),
    currency: data.get('currency'),
    eventDate: String(data.get('eventDate') ?? ''),
    city: String(data.get('city') ?? ''),
    theme: String(data.get('theme') ?? ''),
    notes: String(data.get('notes') ?? ''),
    priorities: data.getAll('priorities'),
    vegetarianOnly: data.has('vegetarianOnly'),
    accessibilityNeeds: data.has('accessibilityNeeds'),
  };
}

function clearErrors() {
  errorSummary.hidden = true;
  errorSummary.replaceChildren();
  for (const el of form.querySelectorAll('.field-error')) {
    el.hidden = true;
    el.textContent = '';
  }
  for (const el of form.querySelectorAll('[aria-invalid]')) el.removeAttribute('aria-invalid');
}

function showErrors(message, issues) {
  clearErrors();
  const list = document.createElement('ul');
  const heading = document.createElement('p');
  heading.textContent = issues.length > 0 ? 'Please fix the following:' : message;
  errorSummary.append(heading);

  for (const issue of issues) {
    const field = issue.field.split('.')[0];
    const item = document.createElement('li');
    const input = form.elements.namedItem(field);
    const label =
      field === 'body'
        ? 'Form'
        : (form.querySelector(`label[for="${field}"]`)?.firstChild?.textContent?.trim() ?? field);
    item.textContent = `${label}: ${issue.message}`;
    list.append(item);

    const inline = document.getElementById(`${field}-error`);
    if (inline) {
      inline.textContent = issue.message;
      inline.hidden = false;
    }
    if (input instanceof Element) input.setAttribute('aria-invalid', 'true');
  }
  if (issues.length > 0) errorSummary.append(list);
  errorSummary.hidden = false;
  errorSummary.focus();
}

function progressStore(input) {
  const key = `celebration-planner:progress:${input.eventType}:${input.eventDate}`;
  const checked = loadChecked(key);
  const onToggle = (id, value) => {
    if (value) checked.add(id);
    else checked.delete(id);
    saveChecked(key, checked);
  };
  return { checked, onToggle };
}

async function handleSubmit(event) {
  event.preventDefault();
  clearErrors();
  const input = readForm();
  const requestId = ++latestRequest;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Planning…';
  status.textContent = 'Building your plan.';

  try {
    // The plan is instant and deterministic; ideas come from the AI and may take a few seconds.
    const planPromise = postJson('/api/plan', input);
    const ideasPromise = postJson('/api/ideas', input);
    ideasPromise.catch(() => {}); // handled below; this avoids an unhandled rejection if the plan fails first

    const plan = await planPromise;
    if (requestId !== latestRequest) return;

    const { checked, onToggle } = progressStore(input);
    renderWarnings($('#warnings'), plan.warnings);
    renderOverview($('#overview'), plan.summary);
    renderBudget($('#budget'), plan);
    renderTimeline($('#timeline'), plan, checked, onToggle);
    renderVendors($('#vendors'), plan, checked, onToggle);
    renderIdeasLoading($('#ideas'));
    $('#ideas-section').setAttribute('aria-busy', 'true');
    results.hidden = false;
    results.focus();
    results.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
    status.textContent = 'Your plan is ready. Personalised ideas are loading.';

    try {
      const ideas = await ideasPromise;
      if (requestId !== latestRequest) return;
      renderIdeas($('#ideas'), ideas);
      status.textContent = 'Your plan and personalised ideas are ready.';
    } catch {
      if (requestId !== latestRequest) return;
      renderIdeasError($('#ideas'));
    } finally {
      if (requestId === latestRequest) $('#ideas-section').setAttribute('aria-busy', 'false');
    }
  } catch (error) {
    if (requestId !== latestRequest) return;
    results.hidden = true;
    const issues = error instanceof ApiError ? error.issues : [];
    showErrors(
      error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      issues,
    );
    status.textContent = 'There were problems with your answers.';
  } finally {
    if (requestId === latestRequest) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create my plan';
    }
  }
}

function setupPriorityLimit() {
  const boxes = [...form.querySelectorAll('input[name="priorities"]')];
  const sync = () => {
    const atLimit = boxes.filter((b) => b.checked).length >= MAX_PRIORITIES;
    for (const box of boxes) box.disabled = atLimit && !box.checked;
  };
  for (const box of boxes) box.addEventListener('change', sync);
  sync();
}

function fillExample() {
  const set = (name, value) => {
    form.elements.namedItem(name).value = value;
  };
  form.querySelector('input[name="eventType"][value="wedding"]').checked = true;
  set('guestCount', '150');
  set('totalBudget', '1500000');
  set('currency', 'INR');
  set('eventDate', localIsoDate(addDays(new Date(), 120)));
  set('city', 'Jaipur');
  set('theme', 'royal heritage with marigolds');
  set('notes', 'Mostly family from out of town. Grandparents need easy access and seating.');
  for (const box of form.querySelectorAll('input[name="priorities"]')) {
    box.checked = ['food', 'memories'].includes(box.value);
    box.disabled = false;
  }
  form.elements.namedItem('vegetarianOnly').checked = true;
  form.elements.namedItem('accessibilityNeeds').checked = true;
  setupPriorityLimit();
  notes.dispatchEvent(new Event('input'));
  clearErrors();
}

function init() {
  const dateInput = form.elements.namedItem('eventDate');
  dateInput.min = localIsoDate();

  notes.addEventListener('input', () => {
    $('#notes-count').textContent = `${notes.value.length} / 500`;
  });
  $('#example-btn').addEventListener('click', fillExample);
  $('#print-btn').addEventListener('click', () => window.print());
  form.addEventListener('submit', handleSubmit);
  setupPriorityLimit();
}

init();
