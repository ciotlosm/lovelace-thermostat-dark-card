import { CARD_VERSION } from './const';
import './card/card';

/* eslint-disable no-console */
console.info(
  `%c THERMOSTAT-DARK-CARD %c v${CARD_VERSION} `,
  'color: white; background: #555; font-weight: 700;',
  'color: white; background: #e36304; font-weight: 700;',
);
/* eslint-enable no-console */

// Register in HA card picker
const customCards = (window as unknown as { customCards: unknown[] }).customCards ?? [];
(window as unknown as { customCards: unknown[] }).customCards = customCards;
customCards.push({
  type: 'thermostat-dark-card',
  name: 'Thermostat Dark Card',
  description: 'A thermostat card with a round dial — supports dark and light themes',
});
