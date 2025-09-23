/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DocumentResponse } from './DocumentResponse';
export type TaxResponse = {
    createdBy?: string;
    modifiedBy?: string;
    company?: string;
    companyUrl?: string;
    email?: string;
    vatAddressId?: string;
    phoneNumber?: string;
    address1?: string;
    address2?: string;
    city?: string;
    regionState?: string;
    zip?: string;
    regionCode?: string;
    taxRegionCode?: string;
    taxRegionStateCode?: string;
    tax1Type?: string;
    tax1Id?: string;
    tax2Type?: string;
    tax2Id?: string;
    currencyCode?: string;
    invoiceTitle?: string;
    /**
     * Indicates customer tax number that has been associated to the company name registered with the government.
     */
    taxRegistrationNumber?: string;
    /**
     * The legal address of the company where the taxID is associated.
     */
    registrationAddress?: string;
    /**
     * The name of the bank that has been registered with company for tax.
     */
    bankName?: string;
    /**
     * The bank account number of company that is registered with the bank name provided.This field is masked with only last 4 digits. being visible.
     */
    bankAccountNumberLast4?: string;
    ceoName?: string;
    businessType?: string;
    businessClassification?: string;
    taxInvoiceTypeName?: string;
    recepientName?: string;
    /**
     * The timestamp on which the terms were accepted , in the format YYYY-MM-DD'T'HH24:mm:ss+ZZZZ
     */
    termsAcceptedOn?: string;
    termsAcceptedBy?: string;
    vatInvoicePhoneRegionCode?: string;
    vatInvoicePhoneNumber?: string;
    gstnvalidated?: string;
    withHoldingAgent?: boolean;
    pezaCustomer?: boolean;
    isSezUnitDeveloper?: boolean;
    documents?: Array<DocumentResponse>;
};

