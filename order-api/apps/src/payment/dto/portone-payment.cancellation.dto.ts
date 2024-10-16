import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";

export enum PaymentCanCelStatus {
    FAILED = 'FAILED',
    REQUESTED = 'REQUESTED',
    SUCCEEDED = 'SUCCEEDED'
}

export class PaymentCancellation {
    @IsEnum(PaymentCanCelStatus)
    status: string;

    @IsString()
    id: string;

    @IsNumber()
    totalAmount: number;

    @IsNumber()
    taxFreeAmount: number;

    @IsNumber()
    vatAmount: number;

    @IsString()
    reason: string;

    @IsString()
    requestedAt: string;

    @IsString()
    @IsOptional()
    cancelledAt?: string;
}