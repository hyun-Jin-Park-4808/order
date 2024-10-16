import { CoreEntity } from "@app/common/entities/common/core.entity";
import { IsBoolean, IsString } from "class-validator";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { CartItem } from "../../cart/entities/cart-item.entity";
import { CartOptionDetail } from "./cart-option-detail.entity";

@Entity('option-items')
export class OptionItem extends CoreEntity {
    @Column({default: false})
    @IsBoolean()
    isDeleted: boolean;

    @Column()
    @IsString()
    optionQuantity: number;

    @ManyToOne((type) => CartItem, (cartItem) => cartItem.optionItems)
    @JoinColumn()
    cartItem: CartItem;

    @OneToMany((type) => CartOptionDetail, 
    (cartOptionDetail) => cartOptionDetail.optionItem, {cascade: true})
    cartOptionDetails?: CartOptionDetail[];
}