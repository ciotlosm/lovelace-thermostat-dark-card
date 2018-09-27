class LovelaceSwiper extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    document.addEventListener('touchstart', handleTouchStart, false);
    document.addEventListener('touchmove', handleTouchMove, false);
  }

  set hass(hass) {

  }

  getCardSize() {
    return 1;
  }

  _setupRows(config) {
  }

  _setupContent() {
    return ``
  }
  _setupStyle() {
    return ``
  }

}

var xDown = null;
var yDown = null;

function getTouches(evt) {
  return evt.touches ||             // browser API
    evt.originalEvent.touches; // jQuery
}

function handleTouchStart(evt) {
  xDown = getTouches(evt)[0].clientX;
  yDown = getTouches(evt)[0].clientY;
};

function handleTouchMove(evt) {
  if (!xDown || !yDown) {
    return;
  }

  var xUp = evt.touches[0].clientX;
  var yUp = evt.touches[0].clientY;

  var xDiff = xDown - xUp;
  var yDiff = yDown - yUp;

  if (Math.abs(xDiff) > Math.abs(yDiff)) {/*most significant*/
    if (xDiff > 0) {
      /* left swipe */
      console.info('swipe left!');
      // tabs = document.getElementsByTagName('paper-tab')
    } else {
      /* right swipe */
      console.info('swipe right!');
    }
  } else {
    if (yDiff > 0) {
      /* up swipe */
    } else {
      /* down swipe */
    }
  }
  /* reset values */
  xDown = null;
  yDown = null;
};

customElements.define('lovelace-swiper', LovelaceSwiper);
