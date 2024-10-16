import { CoreEntity } from "@app/common/entities/common/core.entity";
import { IsNumber, IsOptional } from "class-validator";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { Cart } from "./cart.entity";
import { Product } from "../../product/entities/product.entity";
import { OptionItem } from "../../option/entities/option-item.entity";


@Entity('cart-items')
export class CartItem extends CoreEntity {
    @Column({default: false})
    @IsOptional()
    isDeleted?: boolean;

    @Column({comment: "option 수량이 있는 경우 quantity는 0으로 저장한다."})
    @IsNumber()
    @IsOptional()
    quantity?: number;

    @ManyToOne((type) => Product, (product) => product.cartItems)
    @JoinColumn()
    product: Product;

    @ManyToOne((type) => Cart, (cart) => cart.cartItems)
    @JoinColumn()
    cart?: Cart;

    @OneToMany((type) => OptionItem, (optionItem) => optionItem.cartItem, 
    {cascade: true})
    optionItems?: OptionItem[];
}