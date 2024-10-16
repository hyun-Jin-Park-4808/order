import { CoreEntity } from "@app/common/entities/common/core.entity";
import { OrderOptionDetail } from "../../option/entities/order-option-detail.entity";
import { Type } from "class-transformer";
import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { Product } from "../../product/entities/product.entity";
import { Order } from "./order.entity";

export enum OrderItemStatus {
  BEFORE = 'BEFORE',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  COMPLETE_CANCEL = 'COMPLETE_CANCEL',
  APPLY_REFUND = 'APPLY_REFUND',
  COMPLETE_REFUND = 'COMPLETE_REFUND',
  CONFIRMED = 'CONFIRMED'
}

@Entity('order-items')
export class OrderItem extends CoreEntity {
  @Column()
  @IsString()
  brandName: string;

  @IsOptional()
  @Column({ nullable: true, comment: '할인율' })
  @IsOptional()
  discountRate?: number;

  @Column()
  @IsString()
  productName: string;

  @Column()
  @IsOptional()
  @IsString()
  productCode?: string;

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

  @Column()
  @IsNumber()
  quantity: number;

  @Column({
    type: 'enum',
    enum: OrderItemStatus,
    default: OrderItemStatus.BEFORE
  })
  @IsEnum(OrderItemStatus)
  @IsOptional()
  orderItemStatus?: OrderItemStatus;

  @ManyToOne((type) => Product, (product) => product.orderItems)
  @JoinColumn()
  product: Product;

  @ManyToOne((type) => Order, (order) => order.orderItems)
  order?: Order;

  @OneToMany((type) => OrderOptionDetail, (orderOptionDetail) => orderOptionDetail.orderItem
    , { cascade: true })
  orderOptionDetails?: OrderOptionDetail[];
}