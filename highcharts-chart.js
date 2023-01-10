import {html, PolymerElement} from '@polymer/polymer/polymer-element.js';
import {HighchartsPolymer} from './highcharts-behavior.js'

/**
 * `highcharts-polymer`
 * Very simple el
 *
 * @customElement
 * @polymer
 * @demo demo/index.html
 */
class HighchartsChart extends HighchartsPolymer.ChartBehavior(HighchartsPolymer.BaseBehavior(PolymerElement)) {
  static get template() {
    return html`
      <style>

      </style>
      <div id="Chart"></div>
    `;
  }

  static get is() {
    return 'highcharts-chart';
  }

  static get properties() {
    return {
      type: {type: String, value: 'line', observer: '_updateType'}
    }
  }

  ready() {
    super.ready();
    this.__createChart()
  }
}

window.customElements.define(HighchartsChart.is, HighchartsChart);
