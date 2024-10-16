import { CoreEntity } from "@app/common/entities/common/core.entity";
import { IsOptional, IsString } from "class-validator";
import { Column, Entity, Index, OneToMany, OneToOne } from "typeorm";
import { Cart } from "../../cart/entities/cart.entity";
import { DeliveryMemo } from "../../delivery-memo/enitities/delivery-memo.entity";
import { Delivery } from "../../delivery/entities/delivery.entity";
import { Order } from "../../order/entities/order.entity";

@Entity('members')
export class Member extends CoreEntity {
    @Column()
    @IsString()
    @Index({unique: true})
    email: string;

    @Column({default: false})
    @IsOptional()
    isVerified?: boolean;

    @OneToMany((type) => Delivery, (delivery) => delivery.member)
    deliveries?: Delivery[];

    @OneToMany((type) => DeliveryMemo, (deliveryMemo) => deliveryMemo.member)
    deliveryMemos?: DeliveryMemo[];

    @OneToOne((type) => Cart, (cart) => cart.member)
    cart?: Cart;

    @OneToMany((type) => Order, (order) => order.member)
    orders?: Order[];
}
