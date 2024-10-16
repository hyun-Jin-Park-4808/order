import { EntityRepository, Repository } from "typeorm";
import { CartOptionDetail } from "./cart-option-detail.entity";

@EntityRepository(CartOptionDetail)
export class CartOptionDetailRepository extends Repository<CartOptionDetail> {
}