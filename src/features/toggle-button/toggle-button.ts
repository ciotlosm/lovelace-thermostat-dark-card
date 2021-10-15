/* eslint-disable @typescript-eslint/camelcase */
import { HVAC_OFF } from '../../const';
import { ThermostatUserInterface } from '../../user-interface';
import { ThermostatDarkCardConfig } from '../../types';
import { SvgUtil } from '../../utils';

const TOGGLE_BUTTON_SELECTOR = 'dial__ico__power';

export class ToggleButton {
  private _toggle!: SVGElement;
  private _card!: ThermostatUserInterface;

  constructor(card: ThermostatUserInterface) {
    this._card = card;
  }

  /**
   * Toggle Button Decides itself weather it should be appended
   */
  public appendToContainer(root: SVGElement, options, config: ThermostatDarkCardConfig): void {
    const existingPowerButton = root.querySelector(TOGGLE_BUTTON_SELECTOR);
    if (options.offModeSupport && config.show_toggle && !existingPowerButton) {
      const toggle = this._buildPowerIcon(this._card.cardConfig.radius);
      root.appendChild(toggle);

      this._toggle = toggle;
      this._toggle.addEventListener('click', e => this._handleToggle(e));
    }
  }

  private _buildPowerIcon(radius: number): SVGElement {
    const width = 24;
    const scale = 2.3;
    const scaledWidth = width * scale;
    const powerDef =
      'M16.56,5.44L15.11,6.89C16.84,7.94 18,9.83 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12C6,9.83 7.16,7.94 8.88,6.88L7.44,5.44C5.36,6.88 4,9.28 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12C20,9.28 18.64,6.88 16.56,5.44M13,3H11V13H13';
    const translate = [radius - scaledWidth / 2, radius * 1.7];
    const color = this._card.hvacState == HVAC_OFF ? 'grey' : 'white';
    return (
      this,
      SvgUtil.createSVGElement('path', {
        class: TOGGLE_BUTTON_SELECTOR,
        fill: color,
        d: powerDef,
        transform: 'translate(' + translate[0] + ',' + translate[1] + ') scale(' + scale + ')',
      })
    );
  }

  private _handleToggle(e: MouseEvent): void {
    e.stopPropagation();
    const serviceCall = this._card.hvacState !== HVAC_OFF ? 'turn_off' : 'turn_on';
    this._card._hass.callService('climate', serviceCall, {
      entity_id: this._card.cardConfig.entity,
    });
  }
}
