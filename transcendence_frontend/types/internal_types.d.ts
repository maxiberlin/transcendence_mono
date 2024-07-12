/* eslint-disable import/prefer-default-export */
/* eslint-disable prettier/prettier */

import { ToastNotificationErrorEvent } from '../src/components/bootstrap/BsToasts';
import { SelectedSearchResult } from '../src/routes/social/ProfileSearch';


// declare namespace InternalTypes {
//     interface ToastNotification {
//         color?: string;
//         message: string;
//     }



// }

export { };
interface CustomEventMap extends HTMLElementEventMap {
    toast_notification_error: ToastNotificationErrorEvent;
    profile_search_selected_result: SelectedSearchResult;
}

declare global {
    interface Document {
        // adds definition to Document, but you can do the same with HTMLElement
        addEventListener<K extends keyof CustomEventMap>(
            type: K,
            listener: (this: Document, ev: CustomEventMap[K]) => void,
        ): void;
        dispatchEvent<K extends keyof CustomEventMap>(
            ev: CustomEventMap[K],
        ): void;
    }
    interface HTMLElement {
        // adds definition to Document, but you can do the same with HTMLElement
        addEventListener<K extends keyof CustomEventMap>(
            type: K,
            listener: (this: Document, ev: CustomEventMap[K]) => void,
        ): void;
        removeEventListener<K extends keyof CustomEventMap>(
            type: K,
            listener: (this: Document, ev: CustomEventMap[K]) => void,
        ): void;
        dispatchEvent<K extends keyof CustomEventMap>(
            ev: CustomEventMap[K],
        ): void;
    }
}
