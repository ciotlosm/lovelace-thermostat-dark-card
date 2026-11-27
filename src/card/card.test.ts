import type { HassEntity } from 'home-assistant-js-websocket';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import type { ThermostatDial } from '../dial/dial';
import type { HomeAssistant } from '../ha-types';
import './card';

const ENTITY_ID = 'climate.living_room';
const PENDING_MS = 3000;

type CallService = Mock<HomeAssistant['callService']>;

function climateEntity(attributes: Record<string, unknown>, state = 'heat'): HassEntity {
  return {
    entity_id: ENTITY_ID,
    state,
    attributes: {
      current_temperature: 66,
      min_temp: 50,
      max_temp: 90,
      target_temp_step: 1,
      ...attributes,
    },
    last_changed: '',
    last_updated: '',
    context: { id: '', parent_id: null, user_id: null },
  };
}

function createHass(entity: HassEntity): HomeAssistant & { callService: CallService } {
  return {
    states: { [entity.entity_id]: entity },
    language: 'en',
    callService: vi.fn<HomeAssistant['callService']>().mockResolvedValue(undefined),
  };
}

async function renderCard(entity: HassEntity) {
  const hass = createHass(entity);
  const card = document.createElement('thermostat-dark-card');
  card.setConfig({ type: 'custom:thermostat-dark-card', entity: ENTITY_ID });
  card.hass = hass;
  document.body.append(card);
  await card.updateComplete;
  const dial = card.shadowRoot?.querySelector('thermostat-dial') as ThermostatDial;
  await dial.updateComplete;
  return { card, dial, hass };
}

async function tapDial(dial: ThermostatDial): Promise<void> {
  dial.shadowRoot?.querySelector('svg')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await dial.updateComplete;
}

async function tapChevron(dial: ThermostatDial, id: string): Promise<void> {
  const chevron = dial.shadowRoot?.querySelector(`.dial-chevron[data-id="${id}"]`);
  if (!chevron) throw new Error(`Chevron ${id} is not rendered`);
  chevron.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
  await dial.updateComplete;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
});

describe('thermostat-dark-card setpoint precision', () => {
  it('sends a step from the precise setpoint, not from the rounded display', async () => {
    const { dial, hass } = await renderCard(climateEntity({ temperature: 68.9 }));

    await tapDial(dial);
    await tapChevron(dial, 'target-up');
    vi.advanceTimersByTime(PENDING_MS);

    expect(hass.callService).toHaveBeenLastCalledWith('climate', 'set_temperature', {
      entity_id: ENTITY_ID,
      temperature: 69.9,
    });
  });
});
