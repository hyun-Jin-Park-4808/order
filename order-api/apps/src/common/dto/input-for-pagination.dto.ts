import { SortOrder } from "@app/common/enum/sort.enum";
import { Transform } from "class-transformer";
import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";


export enum SortColumn {
    ID = 'id',
    CREATED_AT = 'createdAt',
    UPDATED_AT = 'updatedAt',
}

export class InputForPagination {
    @IsString()
    email: string;

    @IsOptional()
    @IsEnum(SortColumn)
    sortColumn?: SortColumn;

    @IsOptional()
    @IsEnum(SortOrder)
    sortOrder?: SortOrder;

    @IsNumber()
    @Transform((input) => parseInt(input.value))
    pageNumber: number;
  
    @IsNumber()
    @Transform((input) => parseInt(input.value))
    pageSize: number;
}