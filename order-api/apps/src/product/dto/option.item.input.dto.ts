import { IsNumber, IsOptional } from "class-validator";

export class OptionItemInput {
    @IsNumber()
    @IsOptional()
    optionQuantity?: number;

    @IsOptional()
    optionDetailIds?: number[];
}