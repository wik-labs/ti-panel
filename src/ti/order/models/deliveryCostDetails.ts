/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type deliveryCostDetails = {
    /**
     * The approximate shipping rates we have based upon the quantity. These rates cannot be guaranteed and can change at any time without any notice.
     */
    shippingRate?: string;
    /**
     * The shipping service level that TI can offer. For example - International economy.
     */
    shippingServiceLevel?: string;
    /**
     * This is a 2 character alphabetic, country ISO code. Example - US.
     */
    regionCode?: string;
    /**
     * This is a 3 character alphabetic, currency ISO code. Example - USD.
     */
    currencyCode?: string;
};

