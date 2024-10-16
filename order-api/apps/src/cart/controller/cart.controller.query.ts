import { HttpOkResponse } from '@app/common/utils/common-http-response';
import { createPagableResponse } from '@app/common/utils/http-response/create-pagable-response';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { CartQueryService } from '../service/cart.service.query';
import { CartItemsOutput } from '../dto/cart-item.output.dto';
import { GetCartItemsInput } from '../dto/get-cart-items.input.dto';

@Controller('carts')
export class CartQueryController {
    constructor(
        private readonly cartService: CartQueryService
    ) { }

    @ApiOperation({ summary: '장바구니 목록 조회' })
    @Get('/items')
    async getCart(
        @Query() inputs: GetCartItemsInput): Promise<CartItemsOutput> {
        const result = await this.cartService.getCartItems(inputs);
        return HttpOkResponse({
            content: result[0], // pageable로 오타 수정 필요해 보임. 
            pagable: createPagableResponse(inputs.pageSize, inputs.pageNumber, result[1])
        });
    }
}
