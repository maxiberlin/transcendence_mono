
import {
    RangeChangedEvent,
    VisibilityChangedEvent,
    UnpinnedEvent,
} from './events.js';
import { FlowLayout } from './layout/flowlayout_easy.js';
import { ScrollerController } from './ScrollerController_easy.js';

let _ResizeObserver = window.ResizeObserver;

/**
 * @param {typeof ResizeObserver} Ctor 
 */
export function provideResizeObserver(Ctor) {
    _ResizeObserver = Ctor;
}

export const virtualizerRef = Symbol('virtualizerRef');
const SIZER_ATTRIBUTE = 'virtualizer-sizer';

// let DefaultLayoutConstructor: LayoutConstructor;
let DefaultLayoutConstructor;

export class Virtualizer {
    /** @type {number | null} */
    _benchmarkStart = null;
    
    /** @type {import('./layout/layout.js').LayoutT.Layout | null} */
    _layout = null;
    
    /** @type {HTMLElement[]} */
    _clippingAncestors = [];
    
    /** @type {import('./layout/layout.js').LayoutT.Size | null} */
    _scrollSize = null;

    /** @type {{ left: number; top: number; } | null} */
    _scrollError = null;

    /** @type {import('./layout/layout.js').LayoutT.ChildPositions | null} */
    _childrenPos = null;

    /** @type {import('./layout/layout.js').LayoutT.ChildMeasurements | null} */
    _childMeasurements = null;
    
    /** @type {Map < HTMLElement, unknown >} */
    _toBeMeasured = new Map();

    _rangeChanged = true;

    _itemsChanged = true;

    _visibilityChanged = true;

    /** @type {import('./virt.js').VirtT.VirtualizerHostElement | undefined} */
    _hostElement;
    
    /** @type {ScrollerController | null} */
    _scrollerController = null;
    
    _isScroller = false;
    
    /** @type {HTMLElement | null} */
    _sizer = null;
    
    
    /** @type {ResizeObserver | null} */
    _hostElementRO = null;
    
    
    /** @type {ResizeObserver | null} */
    _childrenRO = null;
    
    /** @type {MutationObserver | null} */
    _mutationObserver = null;
    
    /** @type {(Element | Window)[]} */
    _scrollEventListeners = [];

    /** @type {AddEventListenerOptions} */
    _scrollEventListenerOptions = {
        passive: true,
    };


    _loadListener = this._childLoaded.bind(this);

    /** @type {import('./virt.js').VirtT.ScrollElementIntoViewOptions | null} */
    _scrollIntoViewTarget = null;

    /** @type {((coordinates: import('./layout/layout.js').LayoutT.ScrollToCoordinates) => void) | null} */
    _updateScrollIntoViewCoordinates = null;

    /** @type {Array < unknown >} */
    _items =[];

    _first = -1;

    _last = -1;

    _firstVisible = -1;

    _lastVisible = -1;

    /** @type {WeakSet < Function >} */
    _scheduled = new WeakSet();

    /** @type {((sizes: import('./layout/layout.js').LayoutT.ChildMeasurements) => void) | null} */
    _measureCallback = null;

  /** @type {import('./layout/layout.js').LayoutT.MeasureChildFunction | null} */
    _measureChildOverride = null;


    /** @type {Promise < void> | null} */
    _layoutCompletePromise = null;
    /** @type {Function | null} */
    _layoutCompleteResolver = null;
    /** @type {Function | null} */
    _layoutCompleteRejecter = null;
    /** @type {number | null} */
    _pendingLayoutComplete = null;
    
    /** @type {Promise < void> | null} */
    _layoutInitialized = null;

    _connected = false;

    /**
     * @param {import('./virt.js').VirtT.VirtualizerConfig} config 
     */
    constructor(config) {
        if (!config)  throw new Error( 'Virtualizer constructor requires a configuration object' );
        if (!config.hostElement)  throw new Error( 'Virtualizer configuration requires the "hostElement" property' );

        this._isScroller = false;
        this._hostElement = config.hostElement;

        if (this._hostElement instanceof HTMLElement) {
            this._hostElement.style.display = 'block';
            this._hostElement.style.position = 'relative';
            this._hostElement.style.contain = 'size layout';
        }
        this._hostElement[virtualizerRef] = this;

        const layoutConfig = config.layout || /** @type {import('./layout/layout.js').LayoutT.BaseLayoutConfig} */ ({});
        // Save the promise returned by `_initLayout` as a state
        // variable we can check before updating layout config
        this._layoutInitialized = this._initLayout();
    }

    async _initLayout() {
        this._layout = new FlowLayout((msg) => { this._handleLayoutMessage(msg); });

        if ( this._layout.measureChildren &&  typeof this._layout.updateItemSizes === 'function' ) {
            if (typeof this._layout.measureChildren === 'function') {
                this._measureChildOverride = this._layout.measureChildren;
            }
            this._measureCallback = this._layout.updateItemSizes.bind(this._layout);
        }

        if (this._layout.listenForChildLoadEvents) {
            this._hostElement?.addEventListener('load', this._loadListener, true);
        }

        this._schedule(this._updateLayout);
    }

    _updateView() {
        const hostElement = this._hostElement;
        const scrollingElement = this._scrollerController?.element;
        const layout = this._layout;

        if (hostElement && scrollingElement && layout) {
            let top, left, bottom, right;

            const hostElementBounds = hostElement.getBoundingClientRect();

            top = 0;
            left = 0;
            bottom = window.innerHeight;
            right = window.innerWidth;

            const ancestorBounds = this._clippingAncestors.map((ancestor) =>
                ancestor.getBoundingClientRect()
            );
            ancestorBounds.unshift(hostElementBounds);

            for (const bounds of ancestorBounds) {
                top = Math.max(top, bounds.top);
                left = Math.max(left, bounds.left);
                bottom = Math.min(bottom, bounds.bottom);
                right = Math.min(right, bounds.right);
            }

            const scrollingElementBounds = scrollingElement.getBoundingClientRect();

            const offsetWithinScroller = {
                left: hostElementBounds.left - scrollingElementBounds.left,
                top: hostElementBounds.top - scrollingElementBounds.top,
            };

            const totalScrollSize = {
                width: scrollingElement.scrollWidth,
                height: scrollingElement.scrollHeight,
            };

            const scrollTop = top - hostElementBounds.top + hostElement.scrollTop;
            const scrollLeft = left - hostElementBounds.left + hostElement.scrollLeft;

            const height = bottom - top;
            const width = right - left;

            layout.viewportSize = { width, height };
            layout.viewportScroll = { top: scrollTop, left: scrollLeft };
            layout.totalScrollSize = totalScrollSize;
            layout.offsetWithinScroller = offsetWithinScroller;
        }
    }

    _updateLayout() {
        if (this._layout && this._connected) {
            this._layout.items = this._items;
            this._updateView();
            if (this._childMeasurements !== null) {
                // If the layout has been changed, we may have measurements but no callback
                if (this._measureCallback) {
                    this._measureCallback(this._childMeasurements);
                }
                this._childMeasurements = null;
            }
            this._layout.reflowIfNeeded();
            if (this._benchmarkStart && 'mark' in window.performance) {
                window.performance.mark('uv-end');
            }
        }
    }

    /**
     * @param {Array < unknown > | undefined} items 
     */
    set items(items) {
        if (Array.isArray(items) && items !== this._items) {
            this._itemsChanged = true;
            this._items = items;
            this._schedule(this._updateLayout);
        }
    }

    

    

   

    connected() {
        this._mutationObserver = new MutationObserver(
            this._finishDOMUpdate.bind(this)
        );
        this._hostElementRO = new _ResizeObserver(() =>
            this._hostElementSizeChanged()
        );
        this._childrenRO = new _ResizeObserver(
            this._childrenSizeChanged.bind(this)
        );

        // this._clippingAncestors = getClippingAncestors( this._hostElement );

        this._scrollerController = new ScrollerController(this._clippingAncestors[0]);

        this._schedule(this._updateLayout);
        this._observeAndListen();
        this._connected = true;
    }

    _observeAndListen() {
        if (!this._mutationObserver || !this._hostElementRO || !! this._childrenRO || !this._hostElement || !this._scrollerController) throw new Error("!!")
        this._mutationObserver.observe(this._hostElement, { childList: true });
        this._hostElementRO.observe(this._hostElement);
        this._scrollEventListeners.push(window);
        window.addEventListener('scroll', this, this._scrollEventListenerOptions);
        // this._clippingAncestors.forEach((ancestor) => {
        //     if (!this._mutationObserver || ! this._hostElementRO || !this._hostElement) throw new Error("!!")
        //     ancestor.addEventListener(
        //         'scroll',
        //         this,
        //         this._scrollEventListenerOptions
        //     );
        //     this._scrollEventListeners.push(ancestor);
        //     this._hostElementRO.observe(ancestor);
        // });
        this._hostElementRO.observe(this._scrollerController.element);
        this._children.forEach((child) => this._childrenRO?.observe(child));
        this._scrollEventListeners.forEach((target) =>
            target.addEventListener('scroll', this, this._scrollEventListenerOptions)
        );
    }

    disconnected() {
        this._scrollEventListeners.forEach((target) =>
            target.removeEventListener(
                'scroll',
                this,
                this._scrollEventListenerOptions
            )
        );
        this._scrollEventListeners = [];
        this._clippingAncestors = [];
        this._scrollerController?.detach();
        this._scrollerController = null;
        this._mutationObserver?.disconnect();
        this._mutationObserver = null;
        this._hostElementRO?.disconnect();
        this._hostElementRO = null;
        this._childrenRO?.disconnect();
        this._childrenRO = null;
        this._rejectLayoutCompletePromise('disconnected');
        this._connected = false;
    }



    // _getSizer() {
    //     const hostElement = this._hostElement!;
    //     if (!this._sizer) {
    //         // Use a preexisting sizer element if provided (for better integration
    //         // with vDOM renderers)
    //         let sizer = hostElement.querySelector(
    //             `[${SIZER_ATTRIBUTE}]`
    //         ) as HTMLElement;
    //         if (!sizer) {
    //             sizer = document.createElement('div');
    //             sizer.setAttribute(SIZER_ATTRIBUTE, '');
    //             hostElement.appendChild(sizer);
    //         }
    //         // When the scrollHeight is large, the height of this element might be
    //         // ignored. Setting content and font-size ensures the element has a size.
    //         Object.assign(sizer.style, {
    //             position: 'absolute',
    //             margin: '-2px 0 0 0',
    //             padding: 0,
    //             visibility: 'hidden',
    //             fontSize: '2px',
    //         });
    //         sizer.textContent = '&nbsp;';
    //         sizer.setAttribute(SIZER_ATTRIBUTE, '');
    //         this._sizer = sizer;
    //     }
    //     return this._sizer;
    // }

    // async updateLayoutConfig(layoutConfig: LayoutConfigValue) {
    //     // If layout initialization hasn't finished yet, we wait
    //     // for it to finish so we can check whether the new config
    //     // is compatible with the existing layout before proceeding.
    //     await this._layoutInitialized;
    //     const Ctor =
    //         ((layoutConfig as LayoutSpecifier).type as LayoutConstructor) ||
    //         // The new config is compatible with the current layout,
    //         // so we update the config and return true to indicate
    //         // a successful update
    //         DefaultLayoutConstructor;
    //     if (typeof Ctor === 'function' && this._layout instanceof Ctor) {
    //         const config = { ...(layoutConfig as LayoutSpecifier) } as {
    //             type?: LayoutConstructor;
    //         };
    //         delete config.type;
    //         this._layout.config = config as BaseLayoutConfig;
    //         // The new config requires a different layout altogether, but
    //         // to limit implementation complexity we don't support dynamically
    //         // changing the layout of an existing virtualizer instance.
    //         // Returning false here lets the caller know that they should
    //         // instead make a new virtualizer instance with the desired layout.
    //         return true;
    //     }
    //     return false;
    // }

   

    startBenchmarking() {
        if (this._benchmarkStart === null) {
            this._benchmarkStart = window.performance.now();
        }
    }

    stopBenchmarking() {
        if (this._benchmarkStart !== null) {
            const now = window.performance.now();
            const timeElapsed = now - this._benchmarkStart;
            const entries = performance.getEntriesByName(
                'uv-virtualizing',
                'measure'
            );
            const virtualizationTime = entries
                .filter(
                    (e) => this._benchmarkStart && e.startTime >= this._benchmarkStart && e.startTime < now
                )
                .reduce((t, m) => t + m.duration, 0);
            this._benchmarkStart = null;
            return { timeElapsed, virtualizationTime };
        }
        return null;
    }


    /**
     * 
     * @param {Element} element 
     * @returns {import('./layout/layout.js').LayoutT.ItemBox}
     */
    _measureChild(element) {
        // offsetWidth doesn't take transforms in consideration, so we use
        // getBoundingClientRect which does.
        const { width, height } = element.getBoundingClientRect();
        return Object.assign({ width, height }, getMargins(element));
    }

    /**
     * @param {Function} method 
     * @returns {Promise < void>}
     */
    async _schedule(method) {
        if(!this._scheduled.has(method)) {
            this._scheduled.add(method);
            await Promise.resolve();
            this._scheduled.delete(method);
            method.call(this);
        }
    }

    /** @param {import('./layout/layout.js').LayoutT.StateChangedMessage} state  */
    async _updateDOM(state) {
        this._scrollSize = state.scrollSize;
        this._adjustRange(state.range);
        this._childrenPos = state.childPositions;
        this._scrollError = state.scrollError || null;
        const { _rangeChanged, _itemsChanged } = this;
        if (this._visibilityChanged) {
            this._notifyVisibility();
            this._visibilityChanged = false;
        }
        if (_rangeChanged || _itemsChanged) {
            this._notifyRange();
            this._rangeChanged = false;
        }
        this._finishDOMUpdate();
    }

    _finishDOMUpdate() {
        if (this._connected) {
            // _childrenRO should be non-null if we're connected
            this._children.forEach((child) => this._childrenRO?.observe(child));
            this._checkScrollIntoViewTarget(this._childrenPos);
            this._positionChildren(this._childrenPos);
            this._sizeHostElement(this._scrollSize);
            this._correctScrollError();
            if (this._benchmarkStart && 'mark' in window.performance) {
                window.performance.mark('uv-end');
            }
        }
    }

    _handleScrollEvent() {
        if (this._benchmarkStart && 'mark' in window.performance) {
            try {
                window.performance.measure('uv-virtualizing', 'uv-start', 'uv-end');
            } catch (e) {
                console.warn('Error measuring performance data: ', e);
            }
            window.performance.mark('uv-start');
        }
        if (this._scrollerController?.correctingScrollError === false) {
            // This is a user-initiated scroll, so we unpin the layout
            this._layout?.unpin();
        }
        this._schedule(this._updateLayout);
    }

    /** @param {CustomEvent} event  */
    handleEvent(event) {
        switch (event.type) {
            case 'scroll':
                if (event.currentTarget === window
                    || (event.currentTarget instanceof HTMLElement 
                        && this._clippingAncestors.includes(event.currentTarget))) {
                    this._handleScrollEvent();
                }
                break;
            default:
                console.warn('event not handled', event);
        }
    }

    /** @param {import('./layout/layout.js').LayoutT.LayoutHostMessage} message  */
    _handleLayoutMessage(message) {
        if (message.type === 'stateChanged') {
            this._updateDOM(message);
        } else if (message.type === 'visibilityChanged') {
            this._firstVisible = message.firstVisible;
            this._lastVisible = message.lastVisible;
            this._notifyVisibility();
        } else if (message.type === 'unpinned') {
            this._hostElement?.dispatchEvent(new UnpinnedEvent());
        }
    }

    /** @returns {Array < HTMLElement >} */
    get _children() {
        /** @type {Array<HTMLElement>} */
        const arr = [];
        let next = this._hostElement?.firstElementChild;
        while(next) {
            if (!next.hasAttribute(SIZER_ATTRIBUTE) && next instanceof HTMLElement) {
                arr.push(next);
            }
            next = next.nextElementSibling;
        }
        return arr;
    }

    

    /** @param {import('./layout/layout.js').LayoutT.Size | null} [size]  */
    _sizeHostElement(size) {
        const max = 8200000;
        const h = size && size.width !== null ? Math.min(max, size.width) : 0;
        const v = size && size.height !== null ? Math.min(max, size.height) : 0;
        if (this._hostElement) {
            const style = this._hostElement.style;
            style.minWidth= h ? `${h}px` : '100%';
            style.minHeight= v ? `${v}px` : '100%';
        }
    }

    /** @param {import('./layout/layout.js').LayoutT.ChildPositions | null} pos  */
    _positionChildren(pos) {
        if (pos) {
            pos.forEach(({ top, left, width, height, xOffset, yOffset }, index) => {
                const child = this._children[index - this._first];
                if (child) {
                    child.style.position = 'absolute';
                    child.style.boxSizing = 'border-box';
                    child.style.transform = `translate(${left}px, ${top}px)`;
                    if (width !== undefined) {
                        child.style.width = width + 'px';
                    }
                    if (height !== undefined) {
                        child.style.height = height + 'px';
                    }
                    // @ts-ignore
                    child.style.left = xOffset === undefined ? null : xOffset + 'px';
                    // @ts-ignore
                    child.style.top = yOffset === undefined ? null : yOffset + 'px';
                }
            });
        }
    }

    /** @param {import('./layout/layout.js').LayoutT.InternalRange} range  */
    async _adjustRange(range) {
        const { _first, _last, _firstVisible, _lastVisible } = this;
        this._first = range.first;
        this._last = range.last;
        this._firstVisible = range.firstVisible;
        this._lastVisible = range.lastVisible;
        this._rangeChanged =
            this._rangeChanged || this._first !== _first || this._last !== _last;
        this._visibilityChanged =
            this._visibilityChanged ||
            this._firstVisible !== _firstVisible ||
            this._lastVisible !== _lastVisible;
    }

    _correctScrollError() {
        if (this._scrollError && this._scrollerController) {
            const { scrollTop, scrollLeft } = this._scrollerController;
            const { top, left } = this._scrollError;
            this._scrollError = null;
            this._scrollerController.correctScrollError({
                top: scrollTop - top,
                left: scrollLeft - left,
            });
        }
    }

    /**
     * @param {number} index 
     * @returns {import('./virt.js').VirtT.VirtualizerChildElementProxy | undefined}
     */
    element(index) {
        if (index === Infinity) {
            index = this._items.length - 1;
        }
        return this._items?.[index] === undefined
            ? undefined
            : {
                scrollIntoView: (options: ScrollIntoViewOptions = {}) =>
                    this._scrollElementIntoView({ ...options, index }),
            };
    }

    /** @param {import('./virt.js').VirtT.ScrollElementIntoViewOptions} options  */
    _scrollElementIntoView(options) {
        if (options.index >= this._first && options.index <= this._last) {
            this._children[options.index - this._first].scrollIntoView(options);
        } else if (this._layout) {
            options.index = Math.min(options.index, this._items.length - 1);
            if (options.behavior === 'smooth' && this._scrollerController && this._layout) {
                const coordinates = this._layout.getScrollIntoViewCoordinates(options);
                const { behavior } = options;
                this._updateScrollIntoViewCoordinates =
                    this._scrollerController.managedScrollTo(
                        Object.assign(coordinates, { behavior }),
                        () => this._layout.getScrollIntoViewCoordinates(options),
                        () => (this._scrollIntoViewTarget = null)
                    );
                this._scrollIntoViewTarget = options;
            } else {
                this._layout.pin = options;
            }
        }
    }

    /** @param {import('./layout/layout.js').LayoutT.ChildPositions | null} pos  */
    _checkScrollIntoViewTarget(pos) {
        const { index } = this._scrollIntoViewTarget || {};
        if (index && pos?.has(index) && this._updateScrollIntoViewCoordinates) {
            this._updateScrollIntoViewCoordinates(
                this._layout.getScrollIntoViewCoordinates(this._scrollIntoViewTarget)
            );
        }
    }

    _notifyRange() {
        this._hostElement?.dispatchEvent(
            new RangeChangedEvent({ first: this._first, last: this._last })
        );
    }

    _notifyVisibility() {
        this._hostElement?.dispatchEvent(
            new VisibilityChangedEvent({
                first: this._firstVisible,
                last: this._lastVisible,
            })
        );
    }

    /** @returns {Promise < void>} */
    get layoutComplete() {
        // Lazily create promise
        if(!this._layoutCompletePromise) {
            this._layoutCompletePromise = new Promise((resolve, reject) => {
                this._layoutCompleteResolver = resolve;
                this._layoutCompleteRejecter = reject;
            });
        }
        return this._layoutCompletePromise;
    }

    /** @param {string} reason  */
    _rejectLayoutCompletePromise(reason) {
        if (this._layoutCompleteRejecter !== null) {
            this._layoutCompleteRejecter(reason);
        }
        this._resetLayoutCompleteState();
    }

   

    _resolveLayoutCompletePromise() {
        if (this._layoutCompleteResolver !== null) {
            this._layoutCompleteResolver();
        }
        this._resetLayoutCompleteState();
    }

    _resetLayoutCompleteState() {
        this._layoutCompletePromise = null;
        this._layoutCompleteResolver = null;
        this._layoutCompleteRejecter = null;
        this._pendingLayoutComplete = null;
    }

 
    _hostElementSizeChanged() {
        this._schedule(this._updateLayout);
    }

 
    _childLoaded() { }

    /** @param {ResizeObserverEntry[]} changes */
    _childrenSizeChanged(changes) {
        // Only measure if the layout requires it
        if (this._layout?.measureChildren) {
            for (const change of changes) {
                if (change.target instanceof HTMLElement) {
                    this._toBeMeasured.set( change.target, change.contentRect );
                }
            }
            const mm = {};
            const children = this._children;
            const fn = this._measureChildOverride || this._measureChild;
            for(let i = 0; i <children.length; i++) {
                const child = children[i];
                const idx = this._first + i;
                if (this._itemsChanged || this._toBeMeasured.has(child)) {
                    mm[idx] = fn.call(this, child, this._items[idx]);
                }
            }
            this._childMeasurements = mm;
            this._schedule(this._updateLayout);
            this._toBeMeasured.clear();
        }
           // Don't do anything unless we have a pending promise
        // And only request a frame if we haven't already done so
        if (this._layoutCompletePromise && this._pendingLayoutComplete === null) {
            // Wait one additional frame to be sure the layout is stable
            this._pendingLayoutComplete = requestAnimationFrame(() =>
                requestAnimationFrame(() => this._resolveLayoutCompletePromise())
            );
        }
        this._itemsChanged = false;
        this._rangeChanged = false;
    }
}

function getMargins(el) {
    const style = window.getComputedStyle(el);
    return {
        marginTop: getMarginValue(style.marginTop),
        marginRight: getMarginValue(style.marginRight),
        marginBottom: getMarginValue(style.marginBottom),
        marginLeft: getMarginValue(style.marginLeft),
    };
}

function getMarginValue(value) {
    const float = value ? parseFloat(value) : NaN;
    return Number.isNaN(float) ? 0 : float;
}
