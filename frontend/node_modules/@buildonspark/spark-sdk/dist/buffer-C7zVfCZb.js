import { Buffer } from "buffer";

//#region buffer.js
if (typeof globalThis.Buffer === "undefined") globalThis.Buffer = Buffer;
if (typeof window !== "undefined") {
	if (typeof window.global === "undefined") window.global = window;
	if (typeof window.globalThis === "undefined") window.globalThis = window;
}

//#endregion
export {  };