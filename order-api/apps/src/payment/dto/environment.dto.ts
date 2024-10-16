import { IsString } from "class-validator";

export class EnvironmentDto {
    @IsString()
    storeId: string;

    @IsString()
    channelKey: string;
}