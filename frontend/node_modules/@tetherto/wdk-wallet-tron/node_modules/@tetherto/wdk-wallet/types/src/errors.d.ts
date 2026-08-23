export class NotImplementedError extends Error {
    /**
     * Create a new not implemented error.
     *
     * @param {string} methodName - The method's name.
     */
    constructor(methodName: string);
}
export class SignerError extends Error {
    /**
     * Create a new signer error.
     *
     * @param {string} message - The error's message.
     */
    constructor(message: string);
}
