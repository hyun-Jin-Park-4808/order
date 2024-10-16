import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection, QueryRunner } from 'typeorm';
import { Member } from '../../member/entities/member.entity';
import { MemberRepository } from '../../member/entities/member.repository';
import { Product } from '../../product/entities/product.entity';
import { ProductRepository } from '../../product/entities/product.repository';
import { CartQueryService } from '../service/cart.service.query';
import { CartItem } from '../entities/cart-item.entity';
import { CartItemRepository } from '../entities/cart-item.repository';
import { Cart } from '../entities/cart.entity';
import { CartRepository } from '../entities/cart.repository';
import { GetCartItemsInput } from '../dto/get-cart-items.input.dto';

describe('CartQueryService', () => {
  let service: CartQueryService;
  let connection: Connection;
  let queryRunner: QueryRunner;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartQueryService, MemberRepository, 
        ProductRepository, CartItemRepository, CartRepository,
        { provide: Connection, useValue: { createQueryRunner: jest.fn() } }
      ],
    }).compile();

    service = module.get<CartQueryService>(CartQueryService);
    connection = module.get<Connection>(Connection);

    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        getCustomRepository: jest.fn(),
        getRepository: jest.fn(),
      },
    } as any;

    (connection.createQueryRunner as jest.Mock).mockReturnValue(queryRunner);
  });

  // 각 테스트 이후 모킹 초기화
  afterEach(() => {
    jest.clearAllMocks();
  })

  /* 1. 장바구니 아이템 목록 조회 
   * 이메일을 통해 멤버를 찾아온다. 
   * - 멤버가 인증되지 않았으면 에러를 발생시킨다.
   * - 멤버가 존재하지 않으면 에러를 발생시킨다.  
   * 멤버에 해당하는 카트를 찾는다. 
   * - 카트가 존재하지 않으면 카트가 존재하지 않는다는 에러 메시지를 보낸다. 
   * 카트 목록을 페이징처리하여 반환한다. 
  */
  describe('getCartItems', () => {
    const getCartItemsInput: GetCartItemsInput = {
      email: 'test@email.com',
      pageNumber: 1,
      pageSize: 1
    };
    const product1: Product = {
      id: 1, productName: 'product1', price: 1000, salePrice: 1000, brandName: 'brand1'
    };
    const product2: Product = {
      id: 2, productName: 'product2', price: 1000, salePrice: 1000, brandName: 'brand2'
    };
    const member: Member = { id: 1, email: getCartItemsInput.email }
    const cartItem1: CartItem = { id: 1, product: product1, quantity: 3 };
    const cartItem2: CartItem = { id: 2, product: product2, quantity: 5 };
    const cartItems: CartItem[] = [cartItem1, cartItem2];
    const cart: Cart = { id: 1, member: member, cartItems: cartItems };
    const totalCount = 2;

    it('성공 케이스', async () => {
      jest.spyOn(queryRunner.manager, 'getCustomRepository')
        .mockImplementation((repo) => {
          if (repo === MemberRepository)
            return { validateMember: jest.fn().mockResolvedValue(void 0) };
          if (repo === CartRepository)
            return {
              getByEmail: jest.fn().mockResolvedValue(cart),
            };
        });

    const mockedQueryBuilder = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([cartItems, totalCount]),
    };

    const mockRepository = {
      createQueryBuilder: jest.fn(() => mockedQueryBuilder),
    };

    jest.spyOn(queryRunner.manager, 'getRepository')
    .mockReturnValue(mockRepository as any);

      const result = await service.getCartItems(getCartItemsInput);

      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(result[1]).toBe(totalCount);
    });

    it('카트가 존재하지 않아 발생하는 실패 케이스', async () => {
      jest.spyOn(queryRunner.manager, 'getCustomRepository')
      .mockImplementation((repo) => {
        if (repo === MemberRepository)
          return { validateMember: jest.fn().mockResolvedValue(void 0) };
        if (repo === CartRepository)
          return {
            getByEmail: jest.fn().mockResolvedValue(null),
          };
      });

      await expect(service.getCartItems(getCartItemsInput)).rejects
        .toThrow(
          new BadRequestException(`Not found cart, email: ${getCartItemsInput.email}`)
        );
    });
  });
});