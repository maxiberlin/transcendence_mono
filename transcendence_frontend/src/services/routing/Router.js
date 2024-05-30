import { BaseElem, html } from '../../modules.js';

// * @property {Route[]} children - Eine Liste von Unterrouten, die dieser Route untergeordnet sind.

/**
 * Beschreibt ein Objekt, das eine Route in einer Anwendung darstellt.
 * @typedef {Object} Route
 * @property {string} path - Der Pfad der Route.
 * @property {string} title - Der Pfad der Route.
 * @property {string} component - Der Name des Komponenten, der mit dieser Route verknüpft ist.
 * @property {Array<string>} [segments]
 */

customElements.define("router-default-not-found", class extends BaseElem {
    constructor() {super();}
    render() {return html`<h1>404 Not Found</h1>`};
});
customElements.define("router-invalid-web-component", class extends BaseElem {
    constructor() {super();}
    render() {return html`<h1>unable to create component</h1>`};
});

export class Router {
    static #fadeDuration = 100;


    /** @type {Route} */
    static componentDefault404 = {
        component: "router-default-not-found",
        title: "404 Not Found",
        path: ""
    }
    static componentinvalidComponent = {
        component: "router-invalid-web-component",
        title: "INVALID COMPONENT",
        path: ""
    }

    static makeRedirect = Symbol("router-make-redirect");

    /** @type {Array<Route>} */
    #routes;
    /** @type {HTMLElement} */
    #root;

    /** @param {Array<Route>} routes */
    constructor(routes) {
        this.#setRoutes(routes);
    }

    /** @param {Array<Route>} routes  */
    #setRoutes(routes) {
        this.#routes = routes;
        routes.forEach(route => {
            const routeSegments = route.path.split("/").slice(1);
            routeSegments.forEach((segment) => {
                if (segment[0] === ":") {
                    Object.defineProperty(route, segment.slice(1), {writable: true});
                }
            })
            route.segments = routeSegments;
        });
    }

    #isInit = false;
    /** @param {string} rootElem */
    init(rootElem) {
        if (this.#isInit) return ;
        window.addEventListener("click", (e) => {
            const target = e.composedPath()[0];
            if (target instanceof HTMLElement) {
               
                let href;
                const rootNode = target.getRootNode();
                if (target instanceof HTMLAnchorElement)
                    href = target.getAttribute("href");
                else if (target.closest("a"))
                    href = target.closest("a")?.getAttribute("href");
                else if (rootNode instanceof ShadowRoot && rootNode.host.closest("a"))
                    href = rootNode.host.closest("a")?.getAttribute("href");
                if (href) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.go(href);
                }
            }
        });
        window.addEventListener('popstate',  event => {
            // console.log("popstate!")
            if (!event.state?.route) {
                // console.log("no prev entry: go to '/'");
                this.go("/", false);
            } else {
                this.go(event.state.route, false);
            }
        });
        // console.log("router: mount root component")
        this.#root = document.createElement(rootElem);
        document.body.appendChild(this.#root);
        // // console.log("first path: ", location.pathname);
        // console.log("router, go on init");
        this.go(location.pathname, false);
    }

    /** @param {Array<string>} urlSegments  */
    #findRoute(urlSegments, params) {
        const match = this.#routes.find((route) => {
            // // console.log("FIND ROUTE: route: ", route, " | urlSegments: ", urlSegments);
            if (route.segments?.length !== urlSegments.length) {
                return false;
            }
            const isMatch = route.segments.every((segment, i) => {
                // // console.log("evetry segment: seg1: ", segment, " | seg2: ", urlSegments[i], " | equal? ", segment === urlSegments[i]);
                // console.log("segments: ", segment);
                if (segment[0] === ":") {
                    route[segment.slice(1)] = decodeURIComponent(urlSegments[i]);
                    params[segment.slice(1)] = decodeURIComponent(urlSegments[i]);
                    // console.log("new param route obj: ", route);
                }
                return (segment === urlSegments[i] || segment[0] === ":");
            });
            // // console.log("is Match? ", isMatch);
            return (isMatch);
        })
        return (match);
    }



    toggleHistoryState(route, addToHistory, replace) {
        if (addToHistory && !replace) {
            // console.log("ROUTER Push State, current history: ", history.state);
            history.pushState({ route }, '', route);
            // console.log("ROUTER Push State, new history: ", history.state);
        } else if (!addToHistory && replace) {
            // console.log("ROUTER REPLACE, current history: ", history.state);
            history.replaceState({route}, '', route);
            // console.log("ROUTER REPLACE, new history: ", history.state);
        }
    }

    getOutlet = () => this.#root.querySelector("#root-outlet");


    /**
     * 
     * @param {HTMLElement} component 
     * @param {string} route 
     * @param {Object} params 
     * @returns 
     */
    async mountComp(component, route, params) {
        let val;
        if (typeof component["onBeforeMount"] === "function") {
            val = await component["onBeforeMount"](route, this, params);
            if (val === Router.makeRedirect) {
                return (false);
            }
        }
        this.getOutlet()?.appendChild(component);
        if (typeof component["onAfterMount"] === "function")
        component["onAfterMount"](route, this);
        return (true);
    }
    unmountComp(component, route) {
        const firstChildElem = this.getOutlet()?.firstElementChild;
        if (!firstChildElem) return ;
        if (typeof component["onBeforeUnMount"] === "function")
            component["onBeforeUnMount"](route, this);
        firstChildElem.remove();
        if (typeof component["onAfterUnMount"] === "function")
            component["onAfterUnMount"](route, this);
    }
    redirect(route) {
        history.replaceState({route}, '', route);
        this.go(route, false);
        return (Router.makeRedirect);
    }
   

    /** @param {string} route  */
    go(route, addToHistory=true, replace=false) {

        console.log("router go!, curr scroll: ", history.scrollRestoration)
        if (!this.#isInit) this.#isInit = true;

        const oldRoute = location.pathname;

        let component;
        const params = {};
        const urlSegments = route.split("/").slice(1);
        let matchObj = this.#findRoute(urlSegments, params);
        if (!matchObj) matchObj = Router.componentDefault404;
        component = document.createElement(matchObj.component);
        if (!component) {
            matchObj = Router.componentinvalidComponent;
            component = document.createElement(matchObj.component);
        }
        this.toggleHistoryState(route, addToHistory, replace);
        document.title = matchObj.title;
        
      
        const curr = this.getOutlet()?.firstElementChild;
        if (curr?.tagName === component.tagName) {
            if (typeof curr["onRouteChange"] === "function") {
                curr["onRouteChange"](route);
                return ;
            }
        }
        
        if (!curr) {
            this.mountComp(component, route, params);
            return ;
        }
       
        let fadeOut = curr.animate([{opacity: 1}, {opacity: 0}],{ duration: Router.#fadeDuration});
        fadeOut.addEventListener("finish", () => {
            this.unmountComp(curr, route);
            if (!this.mountComp(component, route, params))
                return ;
            let fadeIn = component.animate([
                {opacity: 0}, {opacity: 1}
            ],{ duration: Router.#fadeDuration});
        });

        // console.log("Router Go done, component name: ", matchObj.component);
        
      
            
            // else if (curr.tagName === component.tagName && curr instanceof BaseElem && typeof curr["onRouteChange"] === "function") {
            // //     console.log("SAME NODE");
            //     curr["onRouteChange"]();
            // }
       
    }
}

// #appendNode(node, oldRoute, newRoute) {
//     const curr = this.#root.firstElementChild;
//     if (!curr) {
//         this.#root.appendChild(node);
//     }else if (curr.tagName === node.tagName && curr instanceof BaseElem && typeof curr["onRouteChange"] === "function") {
// //         console.log("SAME NODE");
//         curr["onRouteChange"]();
//     } else {
//         let fadeOut = curr.animate([{opacity: 1}, {opacity: 0}],{ duration: 200});
//         fadeOut.addEventListener("finish", () => {
//             curr.remove();
//             this.#root.appendChild(node);
//             let fadeIn = node.animate([
//                 {opacity: 0}, {opacity: 1}
//             ],{ duration: 200});
//         });
//     }
// }

// go(route, addToHistory=true, replace=false) {
// //     console.log("router, go: ", route);
//     const oldRoute = location.pathname;
   
//     let component;
//     const urlSegments = route.split("/").slice(1);
//     const matchObj = this.#findRoute(urlSegments);
//     if (matchObj) {
// //         console.log("match found: ", matchObj)
//         component = document.createElement(matchObj.component);
//     }
//     if (component) {
// //         console.log("component created");
//         let shouldAddToHistory;
//         if (!addToHistory && typeof component["beforeHistoryPush"] === "function")
//             shouldAddToHistory = component["beforeHistoryPush"]();
//         if (shouldAddToHistory)
//             addToHistory = shouldAddToHistory;
//         this.toggleHistoryState(route, addToHistory, replace);
//         this.#appendNode(component);
//         document.title = matchObj?.title ?? "Title";
//         if (typeof component["afterRouteMount"] === "function")
//             component["afterRouteMount"]();
        
//     } else {
//         component = document.createElement("template");
//         component.innerHTML = /*html*/`<div><h1>DOCUMENT NOT FOUND</h1></div>`.trim();
//         this.#appendNode(component.content?.firstChild?.cloneNode(true))
//         document.title = "Not Found";
//     }
   
// }