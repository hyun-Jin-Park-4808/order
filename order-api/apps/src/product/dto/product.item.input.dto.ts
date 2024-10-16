import { IsNumber, IsOptional } from "class-validator";
import { OptionItemInput } from "./option.item.input.dto";

export class ItemInput {
    @IsNumber()
    productId: number;

    @IsNumber()
    @IsOptional()
    quantity?: number;

    @IsOptional()
    optionItemInputs?: OptionItemInput[];
}