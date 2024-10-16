import { CoreEntity } from "@app/common/entities/common/core.entity";
import { Type } from "class-transformer";
import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { Column, Entity, OneToMany } from "typeorm";
import { CartItem } from "../../cart/entities/cart-item.entity";
import { OptionGroup } from "../../option/entities/option-group.entity";
import { OrderItem } from "../../order/entities/order-item.entity";

export enum ServiceProductSellingStatus {
  OPEN = 'OPEN',
  STOP = 'STOP',
  SOLDOUT = 'SOLDOUT',
  ERROR = 'ERROR',
}

@Entity('products')
export class Product extends CoreEntity {
  @Column()
  @IsString()
  brandName: string;

  @Column({ nullable: true, comment: '할인율' })
  @IsOptional()
  discountRate?: number;

  @Column()
  @IsString()
  productName: string;

  @Column({nullable: true})
  @IsOptional()
  @IsString()
  productCode?: string;

  @Column({
    type: 'enum',
    enum: ServiceProductSellingStatus,
    default: ServiceProductSellingStatus.OPEN,
    comment: '상품 판매상태',
  })
  @IsEnum(ServiceProductSellingStatus)
  @IsOptional()
  sellingStatus?: ServiceProductSellingStatus;

  @Column({
    comment: '상품 판매가',
  })
  @Type(() => Number)
  @IsNumber()
  price: number;

  @Column({
    comment: '상품 할인가',
  })
  @Type(() => Number)
  @IsNumber()
  salePrice: number;

  @Column({
    comment: '배송비',
    default: 100
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  shippingFee?: number;

  @OneToMany((type) => CartItem, (cartItem) => cartItem.product)
  cartItems?: CartItem[];

  @OneToMany((type) => OrderItem, (orderItem) => orderItem.product)
  orderItems?: OrderItem[];

  @OneToMany((type) => OptionGroup, (optionGroup) => optionGroup.product)
  optionGroups?: OptionGroup[];
}