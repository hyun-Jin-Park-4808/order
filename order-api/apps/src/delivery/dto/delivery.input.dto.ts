import { IsOptional, IsString } from "class-validator";

export class DeliveryInput {
    @IsString()
    customerName: string;

    @IsString()
    phoneNumber: string;

    @IsString()
    address: string;

    @IsOptional()
    isDefault?: boolean;
}