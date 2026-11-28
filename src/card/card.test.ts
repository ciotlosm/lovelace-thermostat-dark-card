import type { HassEntity } from 'home-assistant-js-websocket';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import type { ThermostatDial } from '../dial/dial';
import type { HomeAssistant } from '../ha-types';
import type { ThermostatCardConfig } from '../types';
import './card';
import type { ThermostatDarkCard } from './card';

const ENTITY_ID = 'climate.living_room';
const OTHER_ENTITY_ID = 'climate.bedroom';
const PENDING_MS = 3000;
/** A short delay before sending and a long edit mode, to keep tapping after a change is sent. */
const QUICK_SEND = { pending: 1, edit_timeout: 10 } as const;
const QUICK_SEND_MS = 1000;
const DIAMETER = 400;
/** Distance from the dial center to a point on the tick ring, in CSS pixels. */
const RING_RADIUS = 180;

type CallService = Mock<HomeAssistant['callService']>;
type FakeHass = HomeAssistant & { callService: CallService };

function climateEntity(
  attributes: Record<string, unknown>,
  { state = 'heat', entityId = ENTITY_ID } = {},
): HassEntity {
  return {
    entity_id: entityId,
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

function createHass(...entities: HassEntity[]): FakeHass {
  const states: Record<string, HassEntity> = {};
  for (const entity of entities) states[entity.entity_id] = entity;
  return {
    states,
    language: 'en',
    callService: vi.fn<HomeAssistant['callService']>().mockResolvedValue(undefined),
  };
}

/** Let promise callbacks (service calls settling) and Lit updates run. */
async function flush(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
}

/** Wait out the default `pending` delay, so the last change is sent. */
async function settle(): Promise<void> {
  await vi.advanceTimersByTimeAsync(PENDING_MS);
}

function dialOf(card: ThermostatDarkCard): ThermostatDial {
  const dial = card.shadowRoot?.querySelector('thermostat-dial');
  if (!dial) throw new Error('The card has no dial');
  // happy-dom has no layout: give the dial the size it would have on screen.
  const svg = dial.shadowRoot?.querySelector('svg');
  if (svg) svg.getBoundingClientRect = () => new DOMRect(0, 0, DIAMETER, DIAMETER);
  return dial;
}

async function renderCard(
  entity: HassEntity,
  config: Partial<ThermostatCardConfig> = {},
  hass: FakeHass = createHass(entity),
) {
  const card = document.createElement('thermostat-dark-card');
  card.setConfig({ type: 'custom:thermostat-dark-card', entity: entity.entity_id, ...config });
  card.hass = hass;
  document.body.append(card);
  await flush();
  return { card, hass, dial: () => dialOf(card) };
}

/** Home Assistant pushes a new state for an entity. */
async function pushState(card: ThermostatDarkCard, entity: HassEntity): Promise<void> {
  card.hass = { ...card.hass, states: { ...card.hass.states, [entity.entity_id]: entity } };
  await flush();
}

async function tapDial(dial: ThermostatDial): Promise<void> {
  dial.shadowRoot?.querySelector('svg')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await flush();
}

async function tapChevron(dial: ThermostatDial, id: string): Promise<void> {
  const chevron = dial.shadowRoot?.querySelector(`.dial-chevron[data-id="${id}"]`);
  if (!chevron) throw new Error(`Chevron ${id} is not rendered`);
  chevron.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
  await flush();
}

/** Where on screen `temperature` sits on the tick ring (see `_pointerToTemperature`). */
function ringPoint(dial: ThermostatDial, temperature: number): PointerEventInit {
  const fraction = (temperature - dial.min_temp) / (dial.max_temp - dial.min_temp);
  const gapDegrees = 360 - dial.tick_degrees;
  const angle = ((gapDegrees / 2 + fraction * dial.tick_degrees) * Math.PI) / 180;
  const center = DIAMETER / 2;
  return {
    clientX: center - RING_RADIUS * Math.sin(angle),
    clientY: center + RING_RADIUS * Math.cos(angle),
  };
}

function pointer(dial: ThermostatDial, type: string, temperature: number): void {
  const svg = dial.shadowRoot?.querySelector('svg');
  svg?.dispatchEvent(
    new PointerEvent(type, { bubbles: true, pointerId: 1, ...ringPoint(dial, temperature) }),
  );
}

/** Drag on the ring from one temperature through the others, then lift (or lose) the pointer. */
async function drag(
  dial: ThermostatDial,
  [from, ...through]: number[],
  end: 'pointerup' | 'pointercancel' = 'pointerup',
): Promise<void> {
  pointer(dial, 'pointerdown', from);
  for (const temperature of through) {
    pointer(dial, 'pointermove', temperature);
    await flush();
  }
  pointer(dial, end, through[through.length - 1] ?? from);
  await flush();
}

function shownTarget(dial: ThermostatDial): string {
  const text = dial.shadowRoot?.querySelector('.dial-text--target')?.textContent ?? '';
  return text.replace(/\s+/g, '');
}

/** The values drawn on the tick ring. */
function ringLabels(dial: ThermostatDial): string[] {
  const nodes = dial.shadowRoot?.querySelectorAll('.dial-ring-label') ?? [];
  return Array.from(nodes, (node) => (node.textContent ?? '').replace(/\s+/g, ''));
}

function setTemperatureCalls(hass: FakeHass): unknown[] {
  return hass.callService.mock.calls.map(([, , data]) => data);
}

function lastSetTemperatureCall(hass: FakeHass): unknown {
  const calls = setTemperatureCalls(hass);
  return calls[calls.length - 1];
}

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
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

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await settle();

    expect(hass.callService).toHaveBeenLastCalledWith('climate', 'set_temperature', {
      entity_id: ENTITY_ID,
      temperature: 69.9,
    });
  });
});

describe('thermostat-dark-card single setpoint adjustments', () => {
  const thermostat = () => climateEntity({ temperature: 70 });

  it('sends nothing when edit mode is entered and left without a change', async () => {
    const { dial, hass } = await renderCard(thermostat());

    await tapDial(dial());
    await settle();

    expect(hass.callService).not.toHaveBeenCalled();
  });

  it('sends a tap only once `pending` seconds have passed', async () => {
    const { dial, hass } = await renderCard(thermostat());

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await vi.advanceTimersByTimeAsync(PENDING_MS - 1);
    const callsBefore = setTemperatureCalls(hass).length;
    await vi.advanceTimersByTimeAsync(1);

    expect({ callsBefore, calls: setTemperatureCalls(hass) }).toEqual({
      callsBefore: 0,
      calls: [{ entity_id: ENTITY_ID, temperature: 71 }],
    });
  });

  it('sends a lowered setpoint', async () => {
    const { dial, hass } = await renderCard(thermostat());

    await tapDial(dial());
    await tapChevron(dial(), 'target-down');
    await settle();

    expect(setTemperatureCalls(hass)).toEqual([{ entity_id: ENTITY_ID, temperature: 69 }]);
  });

  it('keeps an adjustment when the user navigates away right after it', async () => {
    const { card, dial, hass } = await renderCard(thermostat());

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    card.remove();
    await settle();

    expect(setTemperatureCalls(hass)).toEqual([{ entity_id: ENTITY_ID, temperature: 71 }]);
  });

  it('makes one call with the last value after rapid taps', async () => {
    const { dial, hass } = await renderCard(thermostat());

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await tapChevron(dial(), 'target-up');
    await tapChevron(dial(), 'target-up');
    await settle();

    expect(setTemperatureCalls(hass)).toEqual([{ entity_id: ENTITY_ID, temperature: 73 }]);
  });

  it('starts the wait again with each tap', async () => {
    const { dial, hass } = await renderCard(thermostat());

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await vi.advanceTimersByTimeAsync(PENDING_MS - 1000);
    await tapChevron(dial(), 'target-up');
    await vi.advanceTimersByTimeAsync(PENDING_MS - 1);

    expect(hass.callService).not.toHaveBeenCalled();
  });

  it('sends taps made while a call is in flight as one later call, in order', async () => {
    const { dial, hass } = await renderCard(thermostat(), QUICK_SEND);
    const firstCall = deferred();
    hass.callService.mockReturnValueOnce(firstCall.promise);

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await vi.advanceTimersByTimeAsync(QUICK_SEND_MS);
    await tapChevron(dial(), 'target-up');
    await tapChevron(dial(), 'target-up');
    await vi.advanceTimersByTimeAsync(QUICK_SEND_MS);
    firstCall.resolve();
    await flush();

    expect(setTemperatureCalls(hass)).toEqual([
      { entity_id: ENTITY_ID, temperature: 71 },
      { entity_id: ENTITY_ID, temperature: 73 },
    ]);
  });

  it('still sends queued taps after the user navigates away', async () => {
    const { card, dial, hass } = await renderCard(thermostat(), QUICK_SEND);
    const firstCall = deferred();
    hass.callService.mockReturnValueOnce(firstCall.promise);

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await vi.advanceTimersByTimeAsync(QUICK_SEND_MS);
    await tapChevron(dial(), 'target-up');
    card.remove();
    await vi.advanceTimersByTimeAsync(QUICK_SEND_MS);
    firstCall.resolve();
    await flush();

    expect(lastSetTemperatureCall(hass)).toEqual({ entity_id: ENTITY_ID, temperature: 72 });
  });

  it('does not send the change again when edit mode times out', async () => {
    const { dial, hass } = await renderCard(thermostat());

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await settle();
    await settle();

    expect(hass.callService).toHaveBeenCalledTimes(1);
  });

  it('sends nothing when the card is removed without a change', async () => {
    const { card, dial, hass } = await renderCard(thermostat());

    await tapDial(dial());
    card.remove();
    await settle();

    expect(hass.callService).not.toHaveBeenCalled();
  });

  it('sends nothing when raising a setpoint already at the maximum', async () => {
    const { dial, hass } = await renderCard(climateEntity({ temperature: 90 }));

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await settle();

    expect(hass.callService).not.toHaveBeenCalled();
  });

  it('sends nothing when lowering a setpoint already at the minimum', async () => {
    const { dial, hass } = await renderCard(climateEntity({ temperature: 50 }));

    await tapDial(dial());
    await tapChevron(dial(), 'target-down');
    await settle();

    expect(hass.callService).not.toHaveBeenCalled();
  });

  it('stops at the maximum', async () => {
    const { dial, hass } = await renderCard(climateEntity({ temperature: 89 }));

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await tapChevron(dial(), 'target-up');
    await settle();

    expect(setTemperatureCalls(hass)).toEqual([{ entity_id: ENTITY_ID, temperature: 90 }]);
  });
});

describe('thermostat-dark-card pending and edit_timeout', () => {
  const thermostat = () => climateEntity({ temperature: 70 });

  it('sends each tap at once when `pending` is 0', async () => {
    const { dial, hass } = await renderCard(thermostat(), { pending: 0 });

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');

    expect(setTemperatureCalls(hass)).toEqual([{ entity_id: ENTITY_ID, temperature: 71 }]);
  });

  it('accepts fractions of a second', async () => {
    const { dial, hass } = await renderCard(thermostat(), { pending: 0.5 });

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await vi.advanceTimersByTimeAsync(500);

    expect(setTemperatureCalls(hass)).toEqual([{ entity_id: ENTITY_ID, temperature: 71 }]);
  });

  it('keeps the arrows open for a second when `pending` is 0', async () => {
    const { dial } = await renderCard(thermostat(), { pending: 0 });

    await tapDial(dial());
    await vi.advanceTimersByTimeAsync(999);

    expect(dial().editing).toBe(true);
  });

  it('stays in edit mode for `pending` seconds when `edit_timeout` is not set', async () => {
    const { dial } = await renderCard(thermostat(), { pending: 5 });

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await vi.advanceTimersByTimeAsync(4999);

    expect(dial().editing).toBe(true);
  });

  it('keeps the arrows open for `edit_timeout` after the change is sent', async () => {
    const { dial, hass } = await renderCard(thermostat(), { pending: 0.5, edit_timeout: 3 });

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await vi.advanceTimersByTimeAsync(2999);

    expect({ editing: dial().editing, calls: setTemperatureCalls(hass).length }).toEqual({
      editing: true,
      calls: 1,
    });
  });

  it('leaves edit mode after `edit_timeout`', async () => {
    const { dial } = await renderCard(thermostat(), { pending: 0.5, edit_timeout: 3 });

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await vi.advanceTimersByTimeAsync(3000);

    expect(dial().editing).toBe(false);
  });

  it('shows a change until it is sent, even with a shorter `edit_timeout`', async () => {
    const { dial } = await renderCard(thermostat(), { pending: 3, edit_timeout: 1 });

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await vi.advanceTimersByTimeAsync(2000);

    expect({ editing: dial().editing, shown: shownTarget(dial()) }).toEqual({
      editing: true,
      shown: '71',
    });
  });

  for (const [label, config, message] of [
    ['a negative pending', { pending: -1 }, 'pending must be a number of seconds, 0 or more'],
    ['a pending given as text', { pending: '3' }, 'pending must be a number of seconds, 0 or more'],
    [
      'a pending that is NaN',
      { pending: Number.NaN },
      'pending must be a number of seconds, 0 or more',
    ],
    [
      'an edit_timeout under a second',
      { edit_timeout: 0.5 },
      'edit_timeout must be a number of seconds, 1 or more',
    ],
  ] as const) {
    it(`rejects ${label}`, () => {
      const card = document.createElement('thermostat-dark-card');
      const invalid = { type: 'custom:thermostat-dark-card', entity: ENTITY_ID, ...config };

      expect(() => card.setConfig(invalid as unknown as ThermostatCardConfig)).toThrow(message);
    });
  }
});

describe('thermostat-dark-card dual setpoint adjustments', () => {
  const thermostat = (idle = {}) =>
    climateEntity(
      { temperature: null, target_temp_low: 65, target_temp_high: 75, ...idle },
      { state: 'heat_cool' },
    );

  it('sends both setpoints when the low one is raised', async () => {
    const { dial, hass } = await renderCard(thermostat());

    await tapDial(dial());
    await tapChevron(dial(), 'low-up');
    await settle();

    expect(setTemperatureCalls(hass)).toEqual([
      { entity_id: ENTITY_ID, target_temp_low: 66, target_temp_high: 75 },
    ]);
  });

  it('sends both setpoints after adjusting the low and then the high one', async () => {
    const { dial, hass } = await renderCard(thermostat());

    await tapDial(dial());
    await tapChevron(dial(), 'low-up');
    await tapChevron(dial(), 'high-down');
    await settle();

    expect(setTemperatureCalls(hass)).toEqual([
      { entity_id: ENTITY_ID, target_temp_low: 66, target_temp_high: 74 },
    ]);
  });

  it('keeps the low setpoint out of the idle zone', async () => {
    const { dial, hass } = await renderCard(
      thermostat({ target_temp_low: 72, target_temp_high: 75 }),
      { idle_zone: 2 },
    );

    await tapDial(dial());
    await tapChevron(dial(), 'low-up');
    await tapChevron(dial(), 'low-up');
    await settle();

    expect(setTemperatureCalls(hass)).toEqual([
      { entity_id: ENTITY_ID, target_temp_low: 73, target_temp_high: 75 },
    ]);
  });

  it('keeps the high setpoint out of the idle zone', async () => {
    const { dial, hass } = await renderCard(
      thermostat({ target_temp_low: 70, target_temp_high: 73 }),
      { idle_zone: 2 },
    );

    await tapDial(dial());
    await tapChevron(dial(), 'high-down');
    await tapChevron(dial(), 'high-down');
    await settle();

    expect(setTemperatureCalls(hass)).toEqual([
      { entity_id: ENTITY_ID, target_temp_low: 70, target_temp_high: 72 },
    ]);
  });
});

describe('thermostat-dark-card read-only mode', () => {
  it('does not enter edit mode or send anything', async () => {
    const { dial, hass } = await renderCard(climateEntity({ temperature: 70 }), {
      readonly: true,
    });

    await tapDial(dial());
    await settle();

    expect({ editing: dial().editing, calls: hass.callService.mock.calls.length }).toEqual({
      editing: false,
      calls: 0,
    });
  });

  it('ignores the arrows when switched to read-only mid-edit', async () => {
    const { card, dial, hass } = await renderCard(climateEntity({ temperature: 70 }));

    await tapDial(dial());
    card.setConfig({ type: 'custom:thermostat-dark-card', entity: ENTITY_ID, readonly: true });
    await flush();
    await tapChevron(dial(), 'target-up');
    await settle();

    expect(hass.callService).not.toHaveBeenCalled();
  });
});

describe('thermostat-dark-card ring drag', () => {
  const thermostat = () => climateEntity({ temperature: 70 });

  it('sends one call with the final value once the drag has ended', async () => {
    const { dial, hass } = await renderCard(thermostat());

    await tapDial(dial());
    await drag(dial(), [70, 72, 75, 78, 80]);
    await settle();

    expect(setTemperatureCalls(hass)).toEqual([{ entity_id: ENTITY_ID, temperature: 80 }]);
  });

  it('sends nothing while the pointer is still down', async () => {
    const { dial, hass } = await renderCard(thermostat());

    await tapDial(dial());
    pointer(dial(), 'pointerdown', 70);
    pointer(dial(), 'pointermove', 75);
    pointer(dial(), 'pointermove', 80);
    await flush();

    expect({ shown: shownTarget(dial()), calls: hass.callService.mock.calls.length }).toEqual({
      shown: '80',
      calls: 0,
    });
  });

  it('holds a tapped change back while a drag is in progress', async () => {
    const { dial, hass } = await renderCard(thermostat());

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    pointer(dial(), 'pointerdown', 71);
    pointer(dial(), 'pointermove', 80);
    await vi.advanceTimersByTimeAsync(PENDING_MS * 2);

    expect(hass.callService).not.toHaveBeenCalled();
  });

  it('keeps a finished drag when the user navigates away right after it', async () => {
    const { card, dial, hass } = await renderCard(thermostat());

    await tapDial(dial());
    await drag(dial(), [70, 80]);
    card.remove();
    await settle();

    expect(setTemperatureCalls(hass)).toEqual([{ entity_id: ENTITY_ID, temperature: 80 }]);
  });

  it('sends nothing for a drag that ends where it started', async () => {
    const { dial, hass } = await renderCard(thermostat());

    await tapDial(dial());
    await drag(dial(), [70, 75, 70]);
    await settle();

    expect(hass.callService).not.toHaveBeenCalled();
  });

  it('still sends an earlier tap after a drag that ends where it started', async () => {
    const { dial, hass } = await renderCard(thermostat());

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await drag(dial(), [71, 75, 71]);
    await settle();

    expect(setTemperatureCalls(hass)).toEqual([{ entity_id: ENTITY_ID, temperature: 71 }]);
  });

  it('puts the setpoint back and sends nothing when the gesture is cancelled', async () => {
    const { dial, hass } = await renderCard(thermostat());

    await tapDial(dial());
    await drag(dial(), [70, 80], 'pointercancel');
    await flush();
    const shown = shownTarget(dial());
    await settle();

    expect({ shown, calls: hass.callService.mock.calls.length }).toEqual({
      shown: '70',
      calls: 0,
    });
  });

  it('ends on the right value when arrows and dragging are mixed', async () => {
    const { dial, hass } = await renderCard(thermostat());

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await drag(dial(), [71, 80]);
    await tapChevron(dial(), 'target-up');
    await settle();

    expect(setTemperatureCalls(hass)).toEqual([{ entity_id: ENTITY_ID, temperature: 81 }]);
  });
});

describe('thermostat-dark-card state from Home Assistant', () => {
  it('does not let a late state update undo newer taps', async () => {
    const { card, dial, hass } = await renderCard(climateEntity({ temperature: 70 }));

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await tapChevron(dial(), 'target-up');
    await pushState(card, climateEntity({ temperature: 71 }));
    await tapChevron(dial(), 'target-up');
    await settle();

    expect(lastSetTemperatureCall(hass)).toEqual({ entity_id: ENTITY_ID, temperature: 73 });
  });

  it('keeps showing the newest tap while older state arrives', async () => {
    const { card, dial } = await renderCard(climateEntity({ temperature: 70 }));

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await tapChevron(dial(), 'target-up');
    await pushState(card, climateEntity({ temperature: 71 }));

    expect(shownTarget(dial())).toBe('72');
  });

  it('keeps showing the sent value after edit mode closes, until Home Assistant reports back', async () => {
    const { dial } = await renderCard(climateEntity({ temperature: 70 }));

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await settle();

    expect({ editing: dial().editing, shown: shownTarget(dial()) }).toEqual({
      editing: false,
      shown: '71',
    });
  });

  it('keeps showing the sent value while the call is still in flight', async () => {
    const { card, dial, hass } = await renderCard(climateEntity({ temperature: 70 }));
    const call = deferred();
    hass.callService.mockReturnValueOnce(call.promise);

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await settle();
    await pushState(card, climateEntity({ temperature: 70, current_temperature: 67 }));

    expect(shownTarget(dial())).toBe('71');
  });

  it('shows what Home Assistant reports after the call, once edit mode has closed', async () => {
    const { card, dial } = await renderCard(climateEntity({ temperature: 70 }));

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await settle();
    await pushState(card, climateEntity({ temperature: 74 }));

    expect(shownTarget(dial())).toBe('74');
  });

  it('keeps edit mode open when Home Assistant reports back during it', async () => {
    const { card, dial } = await renderCard(climateEntity({ temperature: 70 }), {
      pending: 1,
      edit_timeout: 5,
    });

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await vi.advanceTimersByTimeAsync(1000);
    await pushState(card, climateEntity({ temperature: 71 }));

    expect(dial().editing).toBe(true);
  });

  it('shows what Home Assistant reported during edit mode once edit mode closes', async () => {
    const { card, dial } = await renderCard(climateEntity({ temperature: 70 }), {
      pending: 1,
      edit_timeout: 5,
    });

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await vi.advanceTimersByTimeAsync(1000);
    await pushState(card, climateEntity({ temperature: 74 }));
    await vi.advanceTimersByTimeAsync(4000);

    expect(shownTarget(dial())).toBe('74');
  });

  it('shows a state change made elsewhere while edit mode is open but untouched', async () => {
    const { card, dial } = await renderCard(climateEntity({ temperature: 70 }));

    await tapDial(dial());
    await pushState(card, climateEntity({ temperature: 74 }));

    expect(shownTarget(dial())).toBe('74');
  });

  it('goes back to the real setpoint when Home Assistant rejects the change', async () => {
    const { dial, hass } = await renderCard(climateEntity({ temperature: 70 }), {
      pending: 1,
      edit_timeout: 5,
    });
    hass.callService.mockRejectedValueOnce(new Error('Rejected'));

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await vi.advanceTimersByTimeAsync(1000);

    expect({ editing: dial().editing, shown: shownTarget(dial()) }).toEqual({
      editing: false,
      shown: '70',
    });
  });

  it('keeps showing a newer change that is still waiting when an earlier one is rejected', async () => {
    const { dial, hass } = await renderCard(climateEntity({ temperature: 70 }), {
      pending: 1,
      edit_timeout: 5,
    });
    const firstCall = deferred();
    hass.callService.mockReturnValueOnce(firstCall.promise);

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await vi.advanceTimersByTimeAsync(1000);
    await tapChevron(dial(), 'target-up');
    firstCall.reject(new Error('Rejected'));
    await flush();

    expect({ editing: dial().editing, shown: shownTarget(dial()) }).toEqual({
      editing: true,
      shown: '72',
    });
  });

  it('keeps sending queued taps after an earlier call is rejected', async () => {
    const { dial, hass } = await renderCard(climateEntity({ temperature: 70 }), QUICK_SEND);
    const firstCall = deferred();
    hass.callService.mockReturnValueOnce(firstCall.promise);

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await vi.advanceTimersByTimeAsync(QUICK_SEND_MS);
    await tapChevron(dial(), 'target-up');
    await vi.advanceTimersByTimeAsync(QUICK_SEND_MS);
    firstCall.reject(new Error('Rejected'));
    await flush();

    expect(lastSetTemperatureCall(hass)).toEqual({ entity_id: ENTITY_ID, temperature: 72 });
  });

  it('drops a change still waiting to be sent when the HVAC mode changes', async () => {
    const { card, dial, hass } = await renderCard(climateEntity({ temperature: 70 }));

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await pushState(card, climateEntity({ temperature: 70 }, { state: 'off' }));
    await settle();

    expect(hass.callService).not.toHaveBeenCalled();
  });

  it('drops a change still waiting when the HVAC mode changes and comes back', async () => {
    // The mode was different when the change was made, so the setpoints it
    // was made for no longer apply — even if the mode is the same again by
    // the time the change would be sent.
    const { card, dial, hass } = await renderCard(climateEntity({ temperature: 70 }));

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await pushState(card, climateEntity({ temperature: 70 }, { state: 'off' }));
    await pushState(card, climateEntity({ temperature: 70 }, { state: 'heat' }));
    await settle();

    expect(hass.callService).not.toHaveBeenCalled();
  });

  it('ends the edit when the HVAC mode changes, so the next tap starts from the new setpoint', async () => {
    const { card, dial, hass } = await renderCard(climateEntity({ temperature: 70 }));

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await pushState(card, climateEntity({ temperature: 76 }, { state: 'cool' }));
    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await settle();

    expect(setTemperatureCalls(hass)).toEqual([{ entity_id: ENTITY_ID, temperature: 77 }]);
  });

  it('sends the next tap to the new entity, from its setpoint, after the entity is changed', async () => {
    const living = climateEntity({ temperature: 70 });
    const bedroom = climateEntity({ temperature: 60 }, { entityId: OTHER_ENTITY_ID });
    const { card, dial, hass } = await renderCard(living, {}, createHass(living, bedroom));

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    card.setConfig({ type: 'custom:thermostat-dark-card', entity: OTHER_ENTITY_ID });
    await flush();
    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await settle();

    expect(lastSetTemperatureCall(hass)).toEqual({
      entity_id: OTHER_ENTITY_ID,
      temperature: 61,
    });
  });
});

describe('thermostat-dark-card without a current temperature', () => {
  it('still sends a change the user makes', async () => {
    const { dial, hass } = await renderCard(
      climateEntity({ temperature: 70, current_temperature: null }),
    );

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await settle();

    expect(setTemperatureCalls(hass)).toEqual([{ entity_id: ENTITY_ID, temperature: 71 }]);
  });

  it('shows the warning sign in the center and the setpoint while editing', async () => {
    const { dial } = await renderCard(
      climateEntity({ temperature: 70, current_temperature: null }),
    );

    // The sign is what the middle shows: the reading is missing.
    expect(dial().shadowRoot?.querySelector('.dial-warning')).not.toBeNull();

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');

    // The sign gives way to the setpoint: that is the value the chevrons
    // change, so it is the one that belongs in the middle.
    expect(dial().shadowRoot?.querySelector('.dial-warning')).toBeNull();
    expect(shownTarget(dial())).toBe('71');
    expect(ringLabels(dial())).toEqual(['71']);
  });

  it('goes back to the real setpoint when Home Assistant rejects the change', async () => {
    const { dial, hass } = await renderCard(
      climateEntity({ temperature: 70, current_temperature: null }),
    );
    hass.callService.mockRejectedValueOnce(new Error('rejected'));

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await settle();

    expect(ringLabels(dial())).toEqual(['70']);
  });

  it('shows what Home Assistant reports once the change has been sent and reported back', async () => {
    const { card, dial } = await renderCard(
      climateEntity({ temperature: 70, current_temperature: null }),
    );

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await settle();

    // The dial keeps the user's value until Home Assistant reports back.
    expect(ringLabels(dial())).toEqual(['71']);

    // Home Assistant reports a different value — the dial follows it.
    await pushState(card, climateEntity({ temperature: 72, current_temperature: null }));

    expect(ringLabels(dial())).toEqual(['72']);
  });

  it('starts a thermostat without a setpoint from the bottom of its range', async () => {
    const { dial, hass } = await renderCard(
      climateEntity({ temperature: null, current_temperature: null }),
    );

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await settle();

    // The entity has no setpoint, so the arrows start from the bottom of
    // the range: a value Home Assistant can use, never a missing one.
    expect(setTemperatureCalls(hass)).toEqual([{ entity_id: ENTITY_ID, temperature: 51 }]);
  });
});

describe('thermostat-dark-card lifecycle', () => {
  it('leaves no timer running once a change made before removal is sent', async () => {
    const { card, dial } = await renderCard(climateEntity({ temperature: 70 }));

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    card.remove();
    await settle();

    expect(vi.getTimerCount()).toBe(0);
  });

  it('comes back out of edit mode, sending the change once, when re-attached', async () => {
    const { card, dial, hass } = await renderCard(climateEntity({ temperature: 70 }));

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    card.remove();
    document.body.append(card);
    await settle();

    expect({ editing: dial().editing, calls: setTemperatureCalls(hass) }).toEqual({
      editing: false,
      calls: [{ entity_id: ENTITY_ID, temperature: 71 }],
    });
  });
});

describe('thermostat-dark-card and the HVAC mode', () => {
  // Home Assistant's ClimateEntityFeature flags.
  const TARGET_TEMPERATURE = 1;
  const TARGET_TEMPERATURE_RANGE = 2;

  it('sends the single target in heat, even when the entity also reports a range', async () => {
    // A range sent to a device in heat is accepted by Home Assistant and then
    // ignored: the device follows the single target there.
    const { dial, hass } = await renderCard(
      climateEntity({
        temperature: 70,
        target_temp_low: 66,
        target_temp_high: 74,
        supported_features: TARGET_TEMPERATURE | TARGET_TEMPERATURE_RANGE,
      }),
    );

    await tapDial(dial());
    await tapChevron(dial(), 'target-up');
    await settle();

    expect(setTemperatureCalls(hass)).toEqual([{ entity_id: ENTITY_ID, temperature: 71 }]);
  });

  it('sends the range in heat_cool, where the device follows a range', async () => {
    const { dial, hass } = await renderCard(
      climateEntity(
        {
          temperature: 70,
          target_temp_low: 66,
          target_temp_high: 74,
          supported_features: TARGET_TEMPERATURE | TARGET_TEMPERATURE_RANGE,
        },
        { state: 'heat_cool' },
      ),
    );

    await tapDial(dial());
    await tapChevron(dial(), 'low-up');
    await settle();

    expect(setTemperatureCalls(hass)).toEqual([
      { entity_id: ENTITY_ID, target_temp_low: 67, target_temp_high: 74 },
    ]);
  });

  it('offers no setpoint for an entity that has none', async () => {
    // A purifier that only dries air has no target temperature: Home
    // Assistant rejects a set_temperature call for it.
    const { dial, hass } = await renderCard(
      climateEntity({ supported_features: 4, current_temperature: 21 }),
    );

    await tapDial(dial());
    await settle();

    expect(dial().shadowRoot?.querySelector('.dial-chevron')).toBeNull();
    expect(hass.callService).not.toHaveBeenCalled();
  });

  it('offers no setpoint for an entity that is not reporting', async () => {
    // An entity that is unavailable has nothing to send a change to.
    const { dial, hass } = await renderCard(
      climateEntity({ temperature: 60, supported_features: 385 }, { state: 'unavailable' }),
    );

    await tapDial(dial());
    await settle();

    expect(dial().shadowRoot?.querySelector('.dial-chevron')).toBeNull();
    expect(hass.callService).not.toHaveBeenCalled();
  });

  it('offers the setpoint while the device is off, so it can be pre-set', async () => {
    const { dial, hass } = await renderCard(
      climateEntity({ temperature: 60, supported_features: 385 }, { state: 'off' }),
    );

    // The device still reports the target it will use.
    expect(ringLabels(dial())).toEqual(['60']);

    await tapDial(dial());

    // An off device still takes a target: Home Assistant stores it, and the
    // device follows it once its mode changes.
    expect(dial().shadowRoot?.querySelector('.dial-chevron')).not.toBeNull();

    await tapChevron(dial(), 'target-up');
    await settle();

    expect(setTemperatureCalls(hass)).toEqual([{ entity_id: ENTITY_ID, temperature: 61 }]);
  });
});

describe('thermostat-dark-card and the power button', () => {
  // Home Assistant's ClimateEntityFeature flags.
  const TARGET_TEMPERATURE = 1;
  const TURN_OFF = 128;
  const TURN_ON = 256;

  it('offers the power button when the device can be turned off', async () => {
    const { dial } = await renderCard(
      climateEntity({
        temperature: 70,
        supported_features: TARGET_TEMPERATURE | TURN_OFF | TURN_ON,
      }),
    );

    expect(dial().shadowRoot?.querySelector('.dial-power')).not.toBeNull();
  });

  it('offers no power button for a device that cannot be turned off', async () => {
    // Home Assistant refuses the call for a device without the turn.
    const { dial } = await renderCard(
      climateEntity({ temperature: 70, supported_features: TARGET_TEMPERATURE }),
    );

    expect(dial().shadowRoot?.querySelector('.dial-power')).toBeNull();
  });

  it('offers the power button to turn a device on again', async () => {
    const { dial } = await renderCard(
      climateEntity(
        { temperature: 70, supported_features: TARGET_TEMPERATURE | TURN_OFF | TURN_ON },
        { state: 'off' },
      ),
    );

    expect(dial().shadowRoot?.querySelector('.dial-power')).not.toBeNull();
  });
});
