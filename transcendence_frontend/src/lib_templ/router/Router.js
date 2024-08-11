import { BaseElement } from '../BaseElement.js';
import { NotFoundComp, InvalidComp } from './routerDefaults.js';

const ANIMATION_TIME = 50

/**
 * Animates element to fade out.
 * @param {HTMLElement} element - The element to fade out.
 */
function fadeOutElement(element) {
    return element.animate([
        { opacity: 1 },
        { opacity: 0 }
    ], {
        duration: ANIMATION_TIME, // 300ms
        fill: 'forwards' // Make sure animation stays at final state
    }).finished;
}

/**
 * Animates element to fade in.
 * @param {HTMLElement} element - The element to fade in.
 */
function fadeInElement(element) {
    element.style.opacity = '0'; // Set initial opacity for fadeIn
    return element.animate([
        { opacity: 0 },
        { opacity: 1 }
    ], {
        duration: ANIMATION_TIME, // 300ms
        fill: 'forwards'
    }).finished;
}

/**
 * Beschreibt ein Objekt, das eine Route in einer Anwendung darstellt.
 * @typedef {object} Route
 * @property {string} path - Der Pfad der Route.
 * @property {string} title - Der Pfad der Route.
 * @property {string} component - Der Name des Komponenten, der mit dieser Route verknüpft ist.
 * @property {Array<string>} [segments]
 */

export default class Router {
    static #fadeDuration = 100;

    /** @type {Route} */
    static componentDefault404 = {
        component: 'router-default-not-found',
        title: '404 Not Found',
        path: '',
    };

    static componentinvalidComponent = {
        component: 'router-invalid-web-component',
        title: 'INVALID COMPONENT',
        path: '',
    };

    static makeRedirect = Symbol('router-make-redirect');

    /** @type {Array<Route> | undefined} */
    #routes;

    /** @type {BaseElement | HTMLElement | undefined} */
    #root;

    /** @param {Array<Route>} routes */
    constructor(routes) {
        this.#setRoutes(routes);
    }

    /** @param {Array<Route>} routes  */
    #setRoutes(routes) {
        this.#routes = routes;
        routes.forEach((route) => {
            const routeSegments = route.path.split('/').slice(1);
            routeSegments.forEach((segment) => {
                if (segment[0] === ':') {
                    Object.defineProperty(route, segment.slice(1), {
                        writable: true,
                    });
                }
            });
            route.segments = routeSegments;
        });
    }

    #isInit = false;

    /** @param {string} rootElem */
    async init(rootElem) {
        if (this.#isInit) return;
        window.addEventListener('click', (e) => {
            const target = e.composedPath()[0];
            if (target instanceof HTMLElement) {
                let href;
                const rootNode = target.getRootNode();
                if (target instanceof HTMLAnchorElement)
                    href = target.getAttribute('href');
                else if (target.closest('a'))
                    href = target.closest('a')?.getAttribute('href');
                else if (
                    rootNode instanceof ShadowRoot &&
                    rootNode.host.closest('a')
                )
                    href = rootNode.host.closest('a')?.getAttribute('href');
                if (href) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.go(href);
                }
            }
        });
        window.addEventListener('popstate', (event) => {
            console.log("popstate!")
            if (!event.state?.route) {
                // // console.log("no prev entry: go to '/'");
                this.go('/', false);
            } else {
                this.go(event.state.route, false, true);
            }
        });
        // // console.log("router: mount root component")
        this.#root = document.createElement(rootElem);
        document.body.appendChild(this.#root);

        if (this.#root instanceof BaseElement) {
            await this.#root.updateComplete;
        }
        // document.dispatchEvent()
        // // // console.log("first path: ", location.pathname);
        // // console.log("router, go on init");
        this.go(window.location.pathname, false);
    }

    /**
     * @param {Array<string>} urlSegments
     * @param {{ [x: string]: string; } | {}} params
     * @returns {Route | undefined}
     */
    #findRoute(urlSegments, params) {
        const match = this.#routes?.find((route) => {
            // // // console.log("FIND ROUTE: route: ", route, " | urlSegments: ", urlSegments);
            if (route.segments?.length !== urlSegments.length) {
                return false;
            }
            const isMatch = route.segments.every((segment, i) => {
                // // // console.log("evetry segment: seg1: ", segment, " | seg2: ", urlSegments[i], " | equal? ", segment === urlSegments[i]);
                // // console.log("segments: ", segment);
                if (segment[0] === ':') {
                    route[segment.slice(1)] = decodeURIComponent(
                        urlSegments[i],
                    );
                    params[segment.slice(1)] = decodeURIComponent(
                        urlSegments[i],
                    );
                    // // console.log("new param route obj: ", route);
                }
                return segment === urlSegments[i] || segment[0] === ':';
            });
            // // // console.log("is Match? ", isMatch);
            return isMatch;
        });
        return match;
    }

    static toggleHistoryState(route, addToHistory) {
        if (addToHistory) {
            // // console.log("ROUTER Push State, current history: ", history.state);
            window.history.pushState({ route }, '', route);
            // // console.log("ROUTER Push State, new history: ", history.state);
        } else if (!addToHistory) {
            // console.log("ROUTER REPLACE, current history: ", history.state);
            window.history.replaceState({ route }, '', route);
            // // console.log("ROUTER REPLACE, new history: ", history.state);
        }
    }

    getOutlet = () => this.#root?.querySelector('#root-outlet');

    /**
     * @param {HTMLElement} component
     * @param {string} route
     * @param {object} params
     * @param {URL} url
     * @returns {boolean}
     */
    mountComp(component, route, params, url) {
        let val;
        // console.log('Router: mountComp: ', component);
        if (component instanceof BaseElement &&typeof component.onBeforeMount === 'function') {
            // console.log('Router: mountComp. isOk!');
            val = component.onBeforeMount(route, params, url);
            // if (val === Router.makeRedirect) {
            //     return false;
            // }
        }
        // console.log('Router: Mount component: ', component);
        
        this.getOutlet()?.appendChild(component);
        fadeInElement(component);
        if (component instanceof BaseElement && typeof component.onAfterMount === 'function') {
            component.onAfterMount(route);
        }
        return true;
    }

    /**
     * @param {HTMLElement} component
     * @param {string} route
     */
    async unmountComp(component, route) {
        const firstChildElem = this.getOutlet()?.firstElementChild;
        if (!firstChildElem) return;
        if (component instanceof BaseElement && typeof component.onBeforeUnMount === 'function')
            component.onBeforeUnMount();
        await fadeOutElement(component);
        firstChildElem.remove();
        if (component instanceof BaseElement && typeof component.onAfterUnMount === 'function')
            component.onAfterUnMount();
    }

    /**
     * @param {string | URL | null | undefined} route
     * @returns {symbol}
     */
    redirect(route) {
        window.history.replaceState({ route }, '', route);
        if (typeof route === 'string') this.go(route, false);
        return Router.makeRedirect;
    }

    /**
     * @param {string} route
     * @param {boolean} addToHistory
     * @param {boolean} isFromHistory
     */
    async go(route, addToHistory = true, isFromHistory = false) {
        console.log('router go to: ', route);
        if (!this.#isInit) this.#isInit = true;

        const url = new URL(route, window.location.origin);
        route = url.pathname;

       

        let component;
        const params = {};
        const urlSegments = route.split('/').slice(1);
        let matchObj = this.#findRoute(urlSegments, params);

        if (this.#root instanceof BaseElement) {
            this.#root.onRouteChange(route, params, url);
        }

        if (!matchObj) matchObj = Router.componentDefault404;
        component = document.createElement(matchObj.component);
        if (!component) {
            matchObj = Router.componentinvalidComponent;
            component = document.createElement(matchObj.component);
        }
        Router.toggleHistoryState(route, addToHistory);
        document.title = matchObj.title;

        
        

        const curr = this.getOutlet()?.firstElementChild;
        if (!curr) {
            console.log('Router - mount directly!');
            
            this.mountComp(component, route, params, url);
        }else if (curr?.tagName === component.tagName
            && curr instanceof BaseElement
            && typeof curr.onRouteChange === 'function') {
            curr.onRouteChange(route, params, url);
        } else if (curr instanceof HTMLElement) {
            console.log('Router - unmount: ', curr, ' mount: ', component);
            await this.unmountComp(curr, route);
            this.mountComp(component, route, params, url)
        }
        if (!isFromHistory) {
            // console.log('scroll to topp!!!');
            window.scrollTo({left: 0, top: 0, behavior: 'auto'});
        } else {
            // console.log('no scroll! from history');
        }
    }
}
