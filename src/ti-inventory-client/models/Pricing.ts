/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Price breaks by quantity
 */
export type Pricing = {
    /**
     * Pricing currency ISO 4217 code
     */
    currency?: string;
    /**
     * Price breaks
     */
    priceBreaks?: Array<{
        /**
         * Price break quantity
         */
        priceBreakQuantity?: number;
        /**
         * The corresponding price for the price break quantity
         */
        price?: number;
    }>;
};

