
// /**
//  * @typedef {null | boolean | number | string | JsonArray | {[property: string]: Json}} Json
//  */

// /**
//  * @typedef {{[property: string]: Json} | {}} JsonObj
//  */

// /**
//  * @typedef {{[property: string]: Json}} JsonObj
//  * @extends Object
//  */

// /**
//  * @typedef {{[property: string]: Json}} JsonObj
//  */

// /** @typedef {Json[]} JsonArray */



/**
 * @typedef {Object} RequestData
 * @property {URLSearchParams} [searchParams]
 * @property {string | Object | FormData} [bodyData]
 * @property {HeadersInit} [additionalHeaders]
 * @property {string} [csrfHeaderName]
 * @property {string} [csrfCookieName]
 */

export class Fetcher {
    /** @type {URL} */
    #baseUrl;
    /** @type {RequestInit} */
    #requestInit;
    /** @type {number} */
    #timeoutMs;
    #csrf;

    /**
     * @param {string} [baseUrl] 
     * @param {number} [timeoutMs] 
     * @param {RequestInit} [baseRequest]
     * @param {{cookieName: string, headerName: string}} [csrfCookieHeaderName]
     */
    constructor(baseUrl, baseRequest, timeoutMs, csrfCookieHeaderName) {
        this.#baseUrl = new URL(baseUrl ?? "");
        console.log("base url: ", this.#baseUrl);
        this.#timeoutMs = timeoutMs ?? 10000;
        if (baseRequest) {
            this.#requestInit = {... baseRequest};
        } else {
            this.#requestInit = {};
        }
        if (csrfCookieHeaderName) this.#csrf = csrfCookieHeaderName;
        this.#requestInit.headers = new Headers(this.#requestInit.headers);
        this.#requestInit.headers.set("Content-Type", "application/json");
    }

    /** 
     * @param {Response} response 
     * @returns {Promise<Object>}
     */
    #handleResponse(response) {
        return response.text().then((text) => {
            // console.log("RESPONSE TEXT: ");
            // console.log(text);
            const data = text && JSON.parse(text);
            if (!response.ok) {
                // const error = (data && data.message) || response.statusText;
                const error = {};
                error.status = response.status;
                error.statusText = response.statusText;
                if (data) error.data = data;
                console.log("error: ", error);
                return Promise.reject(error);
            }
            return (data);
        });
    }

    /**
     * @param {Headers} headersOld
     * @param {HeadersInit | undefined} headersAdd
     */
    #setHeaders(headersOld, headersAdd) {
        if (headersAdd === undefined || headersAdd === null)
            return ;
        if (headersAdd instanceof Headers) {
            headersAdd.forEach((v, k) => {
                headersOld.append(k, v);
            })
        } else if (headersAdd instanceof Array) {
            headersAdd.forEach((arr) => {
                if (typeof arr[0] !== "string" || typeof arr[1] !== "string")
                    throw new Error("wrong header format");
                headersOld.append(arr[0], arr[1]);
            })
        } else {
            throw new Error("wrong header format");
        }
    }

    /** @param {RequestInit} usedRequest  @param {string | Object | FormData | undefined} bodyData  */
    #setBody(usedRequest, bodyData) {
        if (bodyData === undefined || bodyData === null)
            return ;
        if (typeof bodyData === "string") {
            usedRequest.body = bodyData;
            return ;
        }
        let object = bodyData;
        if (bodyData instanceof FormData) {
            object = {};
            bodyData.forEach((value, key) => object[key] = value);
        }
        usedRequest.body = JSON.stringify(object);
    }

    /**
     * @param {string} url
     * @param {string} method
     * @param {RequestData | undefined} data
     * @returns {Promise<Object>}
     */
    $request(url, method, data) {
        const searchParams = data?.searchParams;
        if (searchParams instanceof URLSearchParams) {
            console.log("search params string: ", searchParams.toString());
            url += `?${searchParams.toString()}`;
        }
        const usedUrl = new URL(url, this.#baseUrl);
        // console.log("used url: ", usedUrl);
        /** @type {RequestInit} */
        const usedRequest = {};
        Object.assign(usedRequest, this.#requestInit);
        // console.log("base req: ", this.#requestInit);
        // console.log("used req: ", usedRequest);
        usedRequest.method = method;
        if (data && usedRequest.headers && usedRequest.headers instanceof Headers) {
            usedRequest.body = typeof data.bodyData === "string" ? data.bodyData : JSON.stringify(data.bodyData);
            this.#setHeaders(usedRequest.headers, data.additionalHeaders);
            this.#setBody(usedRequest, data.bodyData);
        }
        usedRequest.signal = AbortSignal.timeout(this.#timeoutMs);

        // console.log("fetch this url: ", usedUrl.href);
        // console.log("fetch headers: ", usedRequest.headers);
        // console.log("fetch body Data: ", usedRequest.body);

        console.log("fetch url: ", usedUrl);
        return (fetch(usedUrl, usedRequest)
            .then(this.#handleResponse.bind(this))
            
        );
    }

    /** @param {string} url @param {RequestData} [data] @returns {Promise<Object>} */
    $get(url, data) {
        return this.$request(url, "GET", data);
    }

    /** @param {string} url @param {RequestData} data @returns {Promise<Object>} */
    $post(url, data) {
        return this.$request(url, "POST", data);
    }

    /** @param {string} url @param {RequestData} data @returns {Promise<Object>} */
    $put(url, data) {
        return this.$request(url, "PUT", data);
    }
    /** @param {string} url @param {RequestData} [data] @returns {Promise<Object>} */
    $delete(url, data) {
        return this.$request(url, "DELETE", data);
    }
}

export function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
