import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from "class-validator";

export enum CancelRequester {
    ADMIN = 'ADMIN',
    USER = 'USER'
}

export class PortOnePaymentCancelInput {
    @IsString()
    @IsOptional()
    storeId?: string;

    @IsNumber()
    amount: number;

    @IsNumber()
    @IsOptional()
    taxFreeAmount?: number;

    @IsNumber()
    @IsOptional()
    vatAmount?: number;

    @IsString()
    @IsOptional()
    reason?: string;

    @IsEnum(CancelRequester)
    requester: CancelRequester;
}

export class CancelPaymentInput {
    @Type(() => PortOnePaymentCancelInput)
    portOnePaymentCancelInput: PortOnePaymentCancelInput;

    @IsNumber()
    orderId: number;

    @IsArray()
    @IsOptional()
    orderItemIds?: number[];

    @IsBoolean()
    isPartial: boolean;
}