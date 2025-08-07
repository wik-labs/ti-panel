/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type FutureInventory = {
    /**
     * The estimated inventory quantity that will become available. The value can be null if estimated quantity is unknown.
     */
    forecastQuantity?: number;
    /**
     * The estimated week of availability.(UTC, YYYY-MM-DD)
     */
    forecastDate?: string;
};

