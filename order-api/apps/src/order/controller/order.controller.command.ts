import { HttpOkResponse } from '@app/common/utils/common-http-response';
import { Body, Controller, Post, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { EmailInput } from '../../member/dto/email.input.dto';
import { CartItemsOrderInput } from '../dto/cart-items.order.input.dto';
import { OrderOutput } from '../dto/order.output.dto';
import { ProductsOrderInput } from '../dto/products.order.input.dto';
import { OrderCommandService } from '../service/order.service.command';
import { RefundInput } from '../dto/refund.input.dto';

@Controller()
export class OrderCommandController {
    constructor(
        private readonly orderService: OrderCommandService
    ) {}

    @ApiOperation({ summary: '장바구니 상품 주문하기(복수 선택 가능)' })
    @Post("/cartItems")
    async orderCartItems(
        @Query() email: EmailInput,
        @Body() cartItemsOrderInput: CartItemsOrderInput): Promise<OrderOutput> {
        const result = await this.orderService.orderCartItems(email, cartItemsOrderInput);
        return HttpOkResponse(result);
    }

    @ApiOperation({ summary: '상품 바로 주문하기(복수 선택 가능)' })
    @Post("/products")
    async orderProducts(
        @Query() email: EmailInput,
        @Body() productsOrderInput: ProductsOrderInput): Promise<OrderOutput> {
        const result = await this.orderService.orderProducts(email, productsOrderInput);
        return HttpOkResponse(result);
    }

    @ApiOperation({ summary: '환불 신청하기' })
    @Post("/refund")
    async applyRefund(
        @Query() email: EmailInput,
        @Body() refundInput: RefundInput): Promise<OrderOutput> {
        const result = await this.orderService.applyRefund(email, refundInput);
        return HttpOkResponse(result);
    }
}
