/**
 * @template T
 * @param {T} object
 * @param {BaseBase} host
 * @returns {T}
 */
function getUpdateProxy(object, host) {
  const setFunc = (obj, prop, value) => {
    obj[prop] = value;
    host.requestUpdate();
    return true;
  };
  return new Proxy(object, { set: setFunc });
}

export default class BaseBase extends HTMLElement {
  constructor() {
    super();

    /** @type {import('./templ/TemplateAsLiteral').TemplateAsLiteral | Array<import('./templ/TemplateAsLiteral').TemplateAsLiteral> | string | number | boolean} */
    this.propChildren = '';

    this.#props = {
      propChildren: '',
    };
    this.#state = {};

    this.props = getUpdateProxy(this.#props, this);
    this.state = getUpdateProxy(this.#state, this);
  }

  connectedCallback() {
    Object.keys(this).forEach((prop) => {
      const elem = this[prop];
      if (elem && typeof elem.onConnected === 'function') elem.onConnected();
    });
  }

  disconnectedCallback() {
    Object.keys(this).forEach((prop) => {
      const elem = this[prop];
      if (elem && typeof elem.onDisconnected === 'function')
        elem.onDisconnected();
    });
  }

  #props;

  #state;

  requestUpdate() {}
}
