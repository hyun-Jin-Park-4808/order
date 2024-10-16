import { CoreEntity } from "@app/common/entities/common/core.entity";
import { IsEnum, IsString } from "class-validator";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne } from "typeorm";
import { Product } from "../../product/entities/product.entity";
import { OptionDetail } from "./option-detail.entity";

export enum OptionType {
    SELECT = 'SELECT',
    INPUT = 'INPUT',
    ADD_PRODUCT = 'ADD_PRODUCT'
}

@Entity('option-groups')
export class OptionGroup extends CoreEntity {
    @Column()
    @IsString()
    optionName: string;

    @Column({
        type: 'enum',
        enum: OptionType
    })
    @IsEnum(OptionType)
    optionType: OptionType;

    @ManyToOne((type) => Product, (product) => product.optionGroups)
    @JoinColumn()
    product: Product;

    @OneToMany((type) => OptionDetail, (optionDetail) => optionDetail.optionGroup)
    optionDetails?: OptionDetail[]; 
}