import { IsOptional, IsString } from "class-validator";

export class DeliveryMemoInput {
    @IsString()
    memo: string;
}