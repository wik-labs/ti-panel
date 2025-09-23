/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type errors = Array<{
    /**
     * Indicates the section where the error was found, for example, shipping or billing.
     */
    section?: string;
    /**
     * Indicates the exact field where the error is related to within the section.
     */
    field?: string;
    /**
     * Indicates the type of error, for example, Validation Error.
     */
    errorType?: string;
    /**
     * Indicates an error code that was assigned to trouble-shoot with TI support team.
     */
    errorCode?: string;
    /**
     * Indicates the reason for this error.
     */
    reason?: string;
    /**
     * Indicates suggested action to take to correct the error.
     */
    message?: string;
}>;
