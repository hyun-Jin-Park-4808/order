import { CoreEntity } from "@app/common/entities/common/core.entity";
import { Entity, JoinColumn, OneToMany, OneToOne } from "typeorm";
import { Member } from "../../member/entities/member.entity";
import { CartItem } from "./cart-item.entity";

@Entity('carts')
export class Cart extends CoreEntity {
    @OneToOne(() => Member, (member) => member.cart)
    @JoinColumn()
    member: Member;

    @OneToMany(() => CartItem, (cartItem) => cartItem.cart, {cascade: true})
    cartItems?: CartItem[];
}