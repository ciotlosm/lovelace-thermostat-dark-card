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
    const dial = await renderDial({ temperature: 22.5, target_temp_step: 0.5 });

    expect(textOf(dial, '.dial-text--target')).toEqual(['22.5']);
  });

  it('keeps the decimal of a whole target when the step is fractional', async () => {
    const dial = await renderDial({ temperature: 22, target_temp_step: 0.5 });

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

  it('shows the setpoint while editing, not the warning', async () => {
    const dial = await renderDial({
      temperature: 22.5,
      current_temperature: null,
      target_temp_step: 0.5,
      editing: true,
    });

    expect(dial.shadowRoot?.querySelector('.dial-warning')).toBeNull();
    expect(textOf(dial, '.dial-text--target')).toEqual(['22.5']);
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
});
