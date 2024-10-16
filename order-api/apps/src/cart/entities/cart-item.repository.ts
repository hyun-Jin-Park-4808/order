import { EntityRepository, In, Repository } from "typeorm";
import { CartItem } from "./cart-item.entity";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ServiceProductSellingStatus } from "../../product/entities/product.entity";

@EntityRepository(CartItem)
export class CartItemRepository extends Repository<CartItem> {
    async getById(id: number): Promise<CartItem> {
        const cartItem = await this.findOne({
            where: {
                id: id,
            },
            relations: ['product', 'optionItems']
        });
        if(!cartItem) {
            throw new NotFoundException(`Not found cart item, id: ${id}`);
        }
        if(cartItem.product.sellingStatus !== ServiceProductSellingStatus.OPEN) {
            throw new BadRequestException(`Not selling product, 
                cartItemId: ${id}, status: ${cartItem.product.sellingStatus}`);
        }
        return cartItem;
    }

    async getByIds(ids: number[]): Promise<CartItem[]> {
        if (!ids || ids.length === 0) {
            throw new BadRequestException('ID list cannot be empty.');
        }
        
        const cartItems = await this.find({
            where: {
                id: In(ids),
                isDeleted: false
            },
            relations: ['product', 'optionItems']
        });

        if(!cartItems || cartItems.length === 0) {
            throw new BadRequestException(`Not found cart items, idList: ${ids}`);
        }
        return cartItems;
    }

    async getWithDetailByIds(ids: number[]): Promise<CartItem[]> {
        if (!ids || ids.length === 0) {
            throw new BadRequestException('ID list cannot be empty.');
        }
        
        const cartItems = await this.find({
            where: {
                id: In(ids),
                isDeleted: false
            },
            relations: ['product', 'optionItems', 
                'optionItems.cartOptionDetails', 
                'optionItems.cartOptionDetails.optionDetail',
                'optionItems.cartOptionDetails.optionDetail.optionGroup'    
            ]
        });

        if(!cartItems || cartItems.length === 0) {
            throw new BadRequestException(`Not found cart items, idList: ${ids}`);
        }
        return cartItems;
    }
}