import { EntityRepository, Repository } from "typeorm";
import { OrderOptionDetail } from "./order-option-detail.entity";

@EntityRepository(OrderOptionDetail)
export class OrderOptionDetailRepository extends Repository<OrderOptionDetail> {

}