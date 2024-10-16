import { IsArray, IsEnum, IsString } from "class-validator";
import { PaymentAmount } from "./payment.amount.dto";
import { Type } from "class-transformer";

export enum PaymentStatus {
    FAILED = 'FAILED',
    CANCELED = 'CANCELED',
    PAID = 'PAID',
    PARTIAL_CANCELED = 'PARTIAL_CANCELED',
    PAY_PENDING = 'PAY_PENDING',
    READY = 'READY',
    VIRTUAL_ACCOUNT_ISSUED = 'VIRTUAL_ACCOUNT_ISSUED',
    FORGERY = 'FORGERY'
}

export class PortOnePaymentOutput {
    @IsEnum(PaymentStatus)
    status: string;

    @IsString()
    id: string;

    @IsString()
    transactionId: string;

    @IsString()
    requestedAt: string;

    @IsString()
    updatedAt: string;

    @IsString()
    orderName: string;

    @Type(() => PaymentAmount)
    amount: PaymentAmount;
}