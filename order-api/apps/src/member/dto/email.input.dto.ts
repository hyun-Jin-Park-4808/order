import { IsString } from "class-validator";

export class EmailInput {
    @IsString()
    email: string;
}