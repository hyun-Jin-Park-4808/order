import { HttpOkResponse } from '@app/common/utils/common-http-response';
import { Body, Controller, Delete, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { EmailInput } from '../../member/dto/email.input.dto';
import { ItemInput } from '../../product/dto/product.item.input.dto';
import { CartItemOutput, CartItemsOutput } from '../dto/cart-item.output.dto';
import { CartItemsInput } from '../dto/cart-items.input.dto';
import { CartOutput } from '../dto/cart.output.dto';
import { ModifyCartItemInput } from '../dto/modify-cart-item.input.dto';
import { CartCommandService } from '../service/cart.service.command';

@Controller('carts')
export class CartCommandController {
    constructor(
        private readonly cartService: CartCommandService
    ) { }

    @ApiOperation({ summary: '장바구니 담기' })
    @Post()
    async addToCart(
        @Query() email: EmailInput,
        @Body() cartItemInput: ItemInput): Promise<CartOutput> {
        const result = await this.cartService.addToCart(email, cartItemInput);
        return HttpOkResponse(result);
    }

    @ApiOperation({ summary: '장바구니 상품 수정하기' })
    @Patch("/items")
    async modifyCartItem(
        @Query() email: EmailInput,
        @Body() modifyCartItemInput: ModifyCartItemInput): Promise<CartItemOutput> {
        const result = await this.cartService.modifyCartItem(email, modifyCartItemInput);
        return HttpOkResponse(result);
    }

    @ApiOperation({ summary: '장바구니 상품 삭제하기(복수 선택 가능)' })
    @Delete("/items")
    async deleteCartItems(
        @Query() email: EmailInput,
        @Body() cartItemsInput: CartItemsInput): Promise<CartItemsOutput> {
        const result = await this.cartService.deleteCartItems(email, cartItemsInput);
        return HttpOkResponse(result);
    }


}
