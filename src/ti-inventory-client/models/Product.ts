/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FutureInventory } from './FutureInventory';
import type { Pricing } from './Pricing';
/**
 * Product attributes
 */
export type Product = {
    /**
     * The unique identifier of the product (the orderable part number).
     */
    tiPartNumber?: string;
    /**
     * The generic part number of the product (also referred to as the base part number).
     */
    genericPartNumber?: string;
    /**
     * The URL to purchase the product in the TI store.
     */
    buyNowUrl?: string;
    /**
     * The inventory quantity currently on hand for sale in the TI store.
     */
    quantity?: number;
    /**
     * The order limit on TI.com store, if a limit exists.
     */
    limit?: number;
    /**
     * Price break information by currency.
     */
    pricing?: Array<Pricing>;
    readonly futureInventory?: Array<FutureInventory>;
    /**
     * The description of the product
     */
    description?: string;
    /**
     * The minimum order quantity (MOQ) of the product for the TI store
     */
    minimumOrderQuantity?: number;
    /**
     * The standard package quantity (SPQ) of the product
     */
    standardPackQuantity?: number;
    /**
     * The Export Control Classification Number (ECCN) for the product
     */
    exportControlClassificationNumber?: string;
    /**
     * The 10-digit Harmornized Tariff Schedule Code for the product
     */
    htsCode?: string;
    /**
     * The pin count of the product
     */
    pinCount?: number;
    /**
     * The package type of the product
     */
    packageType?: string;
    /**
     * The carrier type for the product
     */
    packageCarrier?: string;
    /**
     * Indicates whether or not a custom reel carrier is available.
     */
    customReel?: boolean;
    /**
     * The product lifecycle status
     */
    lifeCycle?: string;
};

