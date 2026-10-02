import * as events from "tiny-emitter";

export const EVENTS = new events.TinyEmitter();

export const FORM_WITH_PENDING_EVENTS = "form-with-pending-canges";
export const CHECK_AUTHENTICATE = "checkAuthentication";
export const CLEAR_MESSAGES = "clear-messages";
export const SYNC_FAILED_GROUP = "sync-failed";
