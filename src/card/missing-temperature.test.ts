import type { HassEntity } from 'home-assistant-js-websocket';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ThermostatDial } from '../dial/dial';
import type { HomeAssistant } from '../ha-types';
import type { ThermostatDarkCard } from './card';
import './card';

const CLIMATE_ID = 'climate.living_room';
const AMBIENT_ID = 'sensor.living_room_temperature';

function entity(id: string, state: string, attributes: Record<string, unknown>): HassEntity {
  return {
    entity_id: id,
    state,
    attributes,
    last_changed: '',
    last_updated: '',
    context: { id: '', parent_id: null, user_id: null },
  };
}

function climate(attributes: Record<string, unknown>, state = 'heat'): HassEntity {
  return entity(CLIMATE_ID, state, {
    min_temp: 7,
    max_temp: 35,
    target_temp_step: 0.5,
    ...attributes,
  });
}

function createHass(states: HassEntity[]): HomeAssistant {
  const map: Record<string, HassEntity> = {};
  for (const e of states) map[e.entity_id] = e;
  return {
    states: map,
    language: 'en',
    callService: vi.fn<HomeAssistant['callService']>().mockResolvedValue(undefined),
  };
}

async function renderCard(
  hass: HomeAssistant,
  config: Record<string, unknown> = {},
): Promise<{ card: ThermostatDarkCard; dial: ThermostatDial }> {
  const card = document.createElement('thermostat-dark-card') as ThermostatDarkCard;
  card.setConfig({ type: 'custom:thermostat-dark-card', entity: CLIMATE_ID, ...config });
  card.hass = hass;
  document.body.append(card);
  await card.updateComplete;
  const dial = card.shadowRoot?.querySelector('thermostat-dial') as ThermostatDial;
  await dial.updateComplete;
  return { card, dial };
}

function textOf(dial: ThermostatDial, selector: string): string[] {
  const nodes = dial.shadowRoot?.querySelectorAll(selector) ?? [];
  return Array.from(nodes, (node) => (node.textContent ?? '').replace(/\s+/g, ''));
}

function hasWarning(dial: ThermostatDial): boolean {
  return dial.shadowRoot?.querySelector('.dial-warning') !== null;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('thermostat-dark-card without a current temperature', () => {
  it('renders instead of crashing when the entity reports no current temperature', async () => {
    const hass = createHass([climate({ temperature: 22.5 })]);

    const { dial } = await renderCard(hass);

    expect(dial.shadowRoot?.querySelector('svg')).not.toBeNull();
    expect(textOf(dial, '.dial-text--ambient')).toEqual([]);
  });

  it('warns in the center instead of showing a temperature', async () => {
    const hass = createHass([climate({ temperature: 22.5 })]);

    const { dial } = await renderCard(hass);

    expect(hasWarning(dial)).toBe(true);
  });

  it('still shows the target temperature on the rim', async () => {
    const hass = createHass([climate({ temperature: 22.5 })]);

    const { dial } = await renderCard(hass);

    expect(textOf(dial, '.dial-ring-label')).toEqual(['22.5']);
  });

  it('draws no pointer and no active arc without a temperature to place', async () => {
    const hass = createHass([climate({ temperature: 22.5 })]);

    const { dial } = await renderCard(hass);

    expect(dial.shadowRoot?.querySelector('.dial-pointer')).toBeNull();
    expect(dial.shadowRoot?.querySelector('.dial-tick--active')).toBeNull();
  });

  it('does not draw a NaN when the ambient sensor is unavailable', async () => {
    const hass = createHass([
      climate({ current_temperature: 21, temperature: 22.5 }),
      entity(AMBIENT_ID, 'unavailable', {}),
    ]);

    const { dial } = await renderCard(hass, { ambient_temperature: AMBIENT_ID });

    expect(textOf(dial, '.dial-text--ambient')).toEqual(['21.0']);
    expect(textOf(dial, '.dial-text--ambient')).not.toContain('NaN');
  });

  it('falls back to the entity reading when the ambient sensor is unavailable', async () => {
    const hass = createHass([
      climate({ current_temperature: 21, temperature: 22.5 }),
      entity(AMBIENT_ID, 'unavailable', {}),
    ]);

    const { dial } = await renderCard(hass, { ambient_temperature: AMBIENT_ID });

    expect(hasWarning(dial)).toBe(false);
    expect(textOf(dial, '.dial-text--ambient')).toEqual(['21.0']);
  });

  it('warns when neither the ambient sensor nor the entity has a temperature', async () => {
    const hass = createHass([
      climate({ temperature: 22.5 }),
      entity(AMBIENT_ID, 'unavailable', {}),
    ]);

    const { dial } = await renderCard(hass, { ambient_temperature: AMBIENT_ID });

    expect(hasWarning(dial)).toBe(true);
    expect(textOf(dial, '.dial-ring-label')).toEqual(['22.5']);
  });

  it('uses the ambient sensor when it holds a real number', async () => {
    const hass = createHass([
      climate({ current_temperature: 21, temperature: 22.5 }),
      entity(AMBIENT_ID, '19.5', {}),
    ]);

    const { dial } = await renderCard(hass, { ambient_temperature: AMBIENT_ID });

    expect(textOf(dial, '.dial-text--ambient')).toEqual(['19.5']);
  });

  it('renders an unavailable entity without an empty card', async () => {
    const hass = createHass([entity(CLIMATE_ID, 'unavailable', {})]);

    const { card, dial } = await renderCard(hass);

    expect(card.shadowRoot?.querySelector('ha-card')).not.toBeNull();
    expect(dial.shadowRoot?.querySelector('svg')).not.toBeNull();
    expect(hasWarning(dial)).toBe(true);
  });

  it('paints the disc as off when the entity reports no known HVAC action', async () => {
    const hass = createHass([entity(CLIMATE_ID, 'unavailable', {})]);

    const { dial } = await renderCard(hass);

    expect(dial.shadowRoot?.querySelector('.dial-disc--off')).not.toBeNull();
  });
});

describe('thermostat-dark-card reacting to the ambient sensor', () => {
  it('re-renders when the ambient sensor changes', async () => {
    const hass = createHass([
      climate({ current_temperature: 21, temperature: 22.5 }),
      entity(AMBIENT_ID, '19.5', {}),
    ]);
    const { card, dial } = await renderCard(hass, { ambient_temperature: AMBIENT_ID });

    expect(textOf(dial, '.dial-text--ambient')).toEqual(['19.5']);

    // The sensor reports a new value — the card has to pick it up.
    const next = createHass([
      climate({ current_temperature: 21, temperature: 22.5 }),
      entity(AMBIENT_ID, '20.5', {}),
    ]);
    card.hass = next;
    await card.updateComplete;
    await dial.updateComplete;

    expect(textOf(dial, '.dial-text--ambient')).toEqual(['20.5']);
  });

  it('warns when the ambient sensor goes unavailable', async () => {
    const hass = createHass([
      climate({ current_temperature: 21, temperature: 22.5 }),
      entity(AMBIENT_ID, '19.5', {}),
    ]);
    const { card, dial } = await renderCard(hass, { ambient_temperature: AMBIENT_ID });

    const next = createHass([
      climate({ current_temperature: 21, temperature: 22.5 }),
      entity(AMBIENT_ID, 'unavailable', {}),
    ]);
    card.hass = next;
    await card.updateComplete;
    await dial.updateComplete;

    // Falls back to the entity's own reading rather than freezing on 19.5.
    expect(textOf(dial, '.dial-text--ambient')).toEqual(['21.0']);
  });
});
