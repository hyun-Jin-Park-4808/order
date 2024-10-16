import { CoreEntity } from "@app/common/entities/common/core.entity";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from "typeorm";
import { OrderItem } from "../../order/entities/order-item.entity";
import { OptionDetail } from "./option-detail.entity";

export enum OptionType {
    SELECT = 'SELECT',
    INPUT = 'INPUT',
    ADD_PRODUCT = 'ADD_PRODUCT'
}
@Entity('order-option-details')
export class OrderOptionDetail extends CoreEntity {
    @Column()
    @IsString()
    optionValue: string;

    @Column()
    @IsString()
    optionName: string;

    @Column({default: 0})
    @IsString()
    @IsOptional()
    optionPrice?: number;

    @Column({
        type: 'enum',
        enum: OptionType
    })
    @IsEnum(OptionType)
    optionType: OptionType;

    @ManyToOne((type) => OrderItem, (orderItem) => orderItem.orderOptionDetails)
    @JoinColumn()
    orderItem: OrderItem;

    @ManyToOne((type) => OptionDetail, (optionDetail) => optionDetail.orderOptionDetails)
    @JoinColumn()
    optionDetail: OptionDetail;
}