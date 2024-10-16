import { CoreEntity } from "@app/common/entities/common/core.entity";
import { IsOptional, IsString } from "class-validator";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { CartOptionDetail } from "./cart-option-detail.entity";
import { OptionGroup } from "./option-group.entity";
import { OrderOptionDetail } from "./order-option-detail.entity";

@Entity('option-details')
export class OptionDetail extends CoreEntity {
    @Column()
    @IsString()
    optionValue: string;

    @Column({default: 0})
    @IsString()
    @IsOptional()
    optionPrice?: number;

    @ManyToOne((type) => OptionGroup, (optionGroup) => optionGroup.optionDetails)
    @JoinColumn()
    optionGroup: OptionGroup;

    @OneToMany((type) => CartOptionDetail, 
    (cartOptionDetail) => cartOptionDetail.optionDetail, {cascade: true})
    cartOptionDetails?: CartOptionDetail[];

    @OneToMany((type) => OrderOptionDetail, 
    (orderOptionDetail) => orderOptionDetail.optionDetail, {cascade: true})
    orderOptionDetails?: OrderOptionDetail[];
}