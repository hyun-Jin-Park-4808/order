import { IsOptional, IsString } from "class-validator";

export class ModifyDeliveryInput {
    @IsString()
    @IsOptional()
    customerName?: string;

    @IsString()
    @IsOptional()
    phoneNumber?: string;

    @IsString()
    @IsOptional()
    address?: string;

    @IsOptional()
    isDefault?: boolean;
}