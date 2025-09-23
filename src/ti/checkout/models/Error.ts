/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Standard error response
 */
export type Error = {
    /**
     * Error messages
     */
    errors?: Array<{
        /**
         * Unique code for the error returned.
         */
        errorCode?: string;
        /**
         * Classification of the error.
         */
        type?: string;
        /**
         * Used primarily for validation errors. Provides the section of the request where the violating field can be found.
         */
        section?: string;
        /**
         * The name of the field that failed validation, if applicable.
         */
        field?: string;
        /**
         * The reason for the error. Details why the request was rejected.
         */
        reason?: string;
        /**
         * Details of the specific error and the actions to take to resolve. For validation errors, this will include details such as the value that was invalid as well as the constraints.
         */
        message?: string;
    }>;
};

