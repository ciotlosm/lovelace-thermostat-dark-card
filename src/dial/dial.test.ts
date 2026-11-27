import { afterEach, describe, expect, it } from 'vitest';
import './dial';
import type { ThermostatDial } from './dial';

type DialProps = Partial<
  Pick<
    ThermostatDial,
    | 'current_temperature'
    | 'temperature'
    | 'target_temp_low'
    | 'target_temp_high'
    | 'target_temp_step'
    | 'min_temp'
    | 'max_temp'
    | 'editing'
    | 'hvac_action'
    | 'hvac_mode'
    | 'setpoint_readonly'
  >
>;

async function renderDial(props: DialProps): Promise<ThermostatDial> {
  const dial = document.createElement('thermostat-dial');
  Object.assign(dial, { min_temp: -40, max_temp: 100 }, props);
  document.body.append(dial);
  await dial.updateComplete;
  return dial;
}

function textOf(dial: ThermostatDial, selector: string): string[] {
  const nodes = dial.shadowRoot?.querySelectorAll(selector) ?? [];
  return Array.from(nodes, (node) => (node.textContent ?? '').replace(/\s+/g, ''));
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('thermostat-dial temperature display', () => {
  it.each([
    [68.9, '69'],
    [70.6, '71'],
    [70.7, '71'],
    [68.49, '68'],
  ])('shows a %s°F target as %s in the center', async (temperature, expected) => {
    const dial = await renderDial({ temperature, target_temp_step: 1, current_temperature: 65 });

    expect(textOf(dial, '.dial-text--target')).toEqual([expected]);
  });

  it('shows the ambient temperature rounded in the center', async () => {
    const dial = await renderDial({ temperature: 68, current_temperature: 70.6 });

    expect(textOf(dial, '.dial-text--ambient')).toEqual(['71']);
  });

  it('shows a fractional target with its decimal when the step is fractional', async () => {
    const dial = await renderDial({
      temperature: 22.5,
      target_temp_step: 0.5,
      current_temperature: 20,
    });

    expect(textOf(dial, '.dial-text--target')).toEqual(['22.5']);
  });

  it('keeps the decimal of a whole target when the step is fractional', async () => {
    const dial = await renderDial({
      temperature: 22,
      target_temp_step: 0.5,
      current_temperature: 20,
    });

    expect(textOf(dial, '.dial-text--target')).toEqual(['22.0']);
  });

  it('shows a negative ambient temperature that rounds to zero without a sign', async () => {
    const dial = await renderDial({ temperature: 5, current_temperature: -0.2 });

    expect(textOf(dial, '.dial-text--ambient')).toEqual(['0']);
  });

  it('shows a negative whole ambient temperature', async () => {
    const dial = await renderDial({ temperature: 5, current_temperature: -5 });

    expect(textOf(dial, '.dial-text--ambient')).toEqual(['-5']);
  });

  it('rounds the target label on the ring', async () => {
    const dial = await renderDial({ temperature: 68.9, current_temperature: 65 });

    expect(textOf(dial, '.dial-ring-label')).toEqual(['69']);
  });

  it('rounds the ambient label on the ring while editing', async () => {
    const dial = await renderDial({ temperature: 68, current_temperature: 70.6, editing: true });

    expect(textOf(dial, '.dial-ring-label')).toEqual(['71']);
  });

  it('rounds both setpoint labels on the ring in dual mode', async () => {
    const dial = await renderDial({
      target_temp_low: 66.6,
      target_temp_high: 74.5,
      current_temperature: 70,
    });

    expect(textOf(dial, '.dial-ring-label')).toEqual(['67', '75']);
  });

  it('rounds both setpoints in the center while editing in dual mode', async () => {
    const dial = await renderDial({
      target_temp_low: 66.6,
      target_temp_high: 74.5,
      current_temperature: 70,
      editing: true,
    });

    expect(textOf(dial, '.dial-text--low, .dial-text--high')).toEqual(['67', '75']);
  });

  it('shows a negative fractional ambient temperature with its own digits', async () => {
    const dial = await renderDial({
      temperature: 5,
      current_temperature: -3.4,
      target_temp_step: 0.5,
    });

    expect(textOf(dial, '.dial-text--ambient')).toEqual(['-3.4']);
  });

  it('leaves the setpoint it was given untouched', async () => {
    const dial = await renderDial({ temperature: 68.9 });

    expect(dial.temperature).toBe(68.9);
  });
});

describe('thermostat-dial adjustments', () => {
  it('reports a change with an event and leaves its setpoint property to its owner', async () => {
    const dial = await renderDial({ temperature: 70, current_temperature: 65, editing: true });
    const changes: unknown[] = [];
    dial.addEventListener('temperature-changed', (e) => changes.push((e as CustomEvent).detail));

    dial.shadowRoot
      ?.querySelector('.dial-chevron[data-id="target-up"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await dial.updateComplete;

    expect({
      changes,
      property: dial.temperature,
      shown: textOf(dial, '.dial-text--target'),
    }).toEqual({
      changes: [{ temperature: 71 }],
      property: 70,
      shown: ['71'],
    });
  });

  it('keeps the warning sign in the center while the user changes the setpoint', async () => {
    // Without a current temperature there is nothing to promote into the
    // center: the setpoint is not a reading, so the sign stays.
    const dial = await renderDial({ temperature: 70, current_temperature: null, editing: true });
    const changes: unknown[] = [];
    dial.addEventListener('temperature-changed', (e) => changes.push((e as CustomEvent).detail));

    dial.shadowRoot
      ?.querySelector('.dial-chevron[data-id="target-up"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await dial.updateComplete;

    expect(dial.shadowRoot?.querySelector('.dial-warning')).not.toBeNull();
    expect(textOf(dial, '.dial-text--target')).toEqual([]);
    // The change is still reported, and the setpoint is on the rim.
    expect(changes).toEqual([{ temperature: 71 }]);
    expect(textOf(dial, '.dial-ring-label')).toEqual(['71']);
  });
});

describe('thermostat-dial without a current temperature', () => {
  it('warns in the center instead of drawing a temperature', async () => {
    const dial = await renderDial({
      temperature: 22.5,
      current_temperature: null,
      target_temp_step: 0.5,
    });

    expect(textOf(dial, '.dial-text--ambient')).toEqual([]);
    expect(dial.shadowRoot?.querySelector('.dial-warning')).not.toBeNull();
  });

  it('keeps the target on the rim', async () => {
    const dial = await renderDial({
      temperature: 22.5,
      current_temperature: null,
      target_temp_step: 0.5,
    });

    expect(textOf(dial, '.dial-ring-label')).toEqual(['22.5']);
  });

  it('draws no pointer, because there is no position to point at', async () => {
    const dial = await renderDial({
      temperature: 22.5,
      current_temperature: null,
      target_temp_step: 0.5,
    });

    expect(dial.shadowRoot?.querySelector('.dial-pointer')).toBeNull();
  });

  it('keeps the warning sign in the center while editing', async () => {
    const dial = await renderDial({
      temperature: 22.5,
      current_temperature: null,
      target_temp_step: 0.5,
      editing: true,
    });

    // The setpoint never takes the place of the sign, so no control ends up
    // drawn on top of a number that is not a current temperature.
    expect(dial.shadowRoot?.querySelector('.dial-warning')).not.toBeNull();
    expect(textOf(dial, '.dial-text--target')).toEqual([]);
    // The setpoint moves to the ring, so the chevrons are not adjusting blind.
    expect(textOf(dial, '.dial-ring-label')).toEqual(['22.5']);
  });

  it('still shows a temperature when one is reported', async () => {
    const dial = await renderDial({
      temperature: 22.5,
      current_temperature: 21,
      target_temp_step: 0.5,
    });

    expect(dial.shadowRoot?.querySelector('.dial-warning')).toBeNull();
    expect(textOf(dial, '.dial-text--ambient')).toEqual(['21.0']);
  });

  it('keeps the warning sign in the center in dual mode while editing', async () => {
    const dial = await renderDial({
      target_temp_low: 21,
      target_temp_high: 24,
      current_temperature: null,
      target_temp_step: 0.5,
      editing: true,
    });

    expect(dial.shadowRoot?.querySelector('.dial-warning')).not.toBeNull();
    // The setpoints are on the rim instead, so nothing overlaps the sign.
    expect(textOf(dial, '.dial-text--low, .dial-text--high')).toEqual([]);
    expect(textOf(dial, '.dial-ring-label')).toEqual(['21.0', '24.0']);
  });
});

describe('thermostat-dial and the HVAC mode', () => {
  it('keeps the reported action in auto, where the device follows its own schedule', async () => {
    // The target is not what decides the mode in auto, so the dial must not
    // guess a direction from it.
    const dial = await renderDial({
      temperature: 22,
      current_temperature: 20,
      hvac_mode: 'auto',
      hvac_action: 'idle',
      editing: true,
    });

    expect(dial.shadowRoot?.querySelector('.dial-disc--idle')).not.toBeNull();
    expect(dial.shadowRoot?.querySelector('.dial-disc--heating')).toBeNull();
  });

  it('predicts a direction in heat, where the target decides', async () => {
    const dial = await renderDial({
      temperature: 22,
      current_temperature: 20,
      hvac_mode: 'heat',
      hvac_action: 'idle',
      editing: true,
    });

    expect(dial.shadowRoot?.querySelector('.dial-disc--heating')).not.toBeNull();
  });

  it('does not enter edit mode when the setpoint cannot be changed', async () => {
    const dial = await renderDial({
      temperature: 22,
      current_temperature: 21,
      setpoint_readonly: true,
    });

    dial.shadowRoot
      ?.querySelector('svg')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await dial.updateComplete;

    expect(dial.editing).toBe(false);
    expect(dial.shadowRoot?.querySelector('.dial-chevron')).toBeNull();
  });

  it('ends the edit when the setpoint changes shape', async () => {
    const dial = await renderDial({
      temperature: 22,
      target_temp_low: 20,
      target_temp_high: 24,
      current_temperature: 21,
      editing: true,
    });
    expect(dial.editing).toBe(true);

    // The device now follows a single target instead of a range.
    dial.target_temp_low = null;
    dial.target_temp_high = null;
    await dial.updateComplete;

    expect(dial.editing).toBe(false);
  });
});
