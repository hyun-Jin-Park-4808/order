import { EntityRepository, Repository } from "typeorm";
import { Cart } from "./cart.entity";

@EntityRepository(Cart)
export class CartRepository extends Repository<Cart> {
    async getByEmail(email: string): Promise<Cart | null> {
        const cart = await this.findOne({
            where: {
                member: {
                    email: email,
                },
            },
            relations: ['member', 'cartItems', 'cartItems.product'], // 연관 엔티티 함께 불러오기 
        });
        return cart;
    }
}