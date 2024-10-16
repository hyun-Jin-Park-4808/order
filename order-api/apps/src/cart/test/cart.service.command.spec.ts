import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection, QueryRunner } from 'typeorm';
import { EmailInput } from '../../member/dto/email.input.dto';
import { Member } from '../../member/entities/member.entity';
import { MemberRepository } from '../../member/entities/member.repository';
import { OptionDetail } from '../../option/entities/option-detail.entity';
import { OptionDetailRepository } from '../../option/entities/option-detail.repository';
import { OptionGroup, OptionType } from '../../option/entities/option-group.entity';
import { ItemInput } from '../../product/dto/product.item.input.dto';
import { Product, ServiceProductSellingStatus } from '../../product/entities/product.entity';
import { ProductRepository } from '../../product/entities/product.repository';
import { CartItemsInput } from '../dto/cart-items.input.dto';
import { ModifyCartItemInput } from '../dto/modify-cart-item.input.dto';
import { CartItem } from '../entities/cart-item.entity';
import { CartItemRepository } from '../entities/cart-item.repository';
import { Cart } from '../entities/cart.entity';
import { CartRepository } from '../entities/cart.repository';
import { CartCommandService } from '../service/cart.service.command';
import { OptionItemRepository } from '../../option/entities/option-item.repository';
import { OptionItem } from '../../option/entities/option-item.entity';

describe('CartCommandService', () => {
  let service: CartCommandService;
  let connection: Connection;
  let queryRunner: QueryRunner;
  let members: MemberRepository;
  let products: ProductRepository;
  let cartItems: CartItemRepository;
  let optionDetails: OptionDetailRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartCommandService, MemberRepository,
        ProductRepository, CartItemRepository, OptionDetailRepository,
        { provide: Connection, useValue: { createQueryRunner: jest.fn() } }
      ],
    }).compile();

    service = module.get<CartCommandService>(CartCommandService);
    connection = module.get<Connection>(Connection);
    members = module.get<MemberRepository>(MemberRepository);
    products = module.get<ProductRepository>(ProductRepository);
    cartItems = module.get<CartItemRepository>(CartItemRepository);
    optionDetails = module.get<OptionDetailRepository>(OptionDetailRepository);

    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        getCustomRepository: jest.fn(),
      },
    } as any;

    (connection.createQueryRunner as jest.Mock).mockReturnValue(queryRunner);
  });

  // 각 테스트 이후 모킹 초기화
  afterEach(() => {
    jest.clearAllMocks();
  })

  /* 1. 장바구니 담기
   * 이메일을 통해 멤버를 찾아온다. 
   * - 멤버가 인증되지 않았으면 에러를 발생시킨다.
   * - 멤버가 존재하지 않으면 에러를 발생시킨다.  
   * productId를 통해 product를 찾아온다. 
   * - 상품이 존재하지 않으면 에러를 발생시킨다. 
   * - 상품의 판매 상태가 OPEN이 아니면 에러를 발생시킨다. 
   * 옵션이 있으면 OptionItem을 저장하기 위한 객체를 만든다.
   * - 옵션의 product의 id와 찾은 product의 id가 일치하지 않으면 에러를 발생시킨다.
   * 입력된 수량이 없으면 에러를 발생시킨다. 
   * 찾은 상품을 CartItemDto로 변환한다.
   * 기존 멤버의 cart를 찾는다. 없으면 새로 만든다.   
   * cartItem을 Cart에 추가한다. 
  */
  describe('addToCart', () => {
    const quantity = 3;
    const emailInput: EmailInput = { email: 'test@email.com' };
    const product: Product = {
      id: 1, productName: 'product1', price: 1000, salePrice: 1000, brandName: 'brand1',
    };
    const cartItemInput: ItemInput = { productId: 1, quantity: quantity };
    const member: Member = { id: 1, email: emailInput.email }
    const cart: Cart = { id: 1, member: member, 
      cartItems: [{ id: 1, product: product, quantity: quantity }] };

    it('성공 케이스, 기존에 카트가 없는 경우, 옵션 x', async () => {
      jest.spyOn(queryRunner.manager, 'getCustomRepository')
        .mockImplementation((repo) => {
          if (repo === MemberRepository)
            return { getByEmail: jest.fn().mockResolvedValue(member) };
          if (repo === ProductRepository)
            return { getById: jest.fn().mockResolvedValue(product) };
          if (repo === CartRepository)
            return {
              getByEmail: jest.fn().mockResolvedValue(null),
              save: jest.fn().mockResolvedValue(cart)
            };
        });

      const result = await service.addToCart(emailInput, cartItemInput);

      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(result.cartItems.length).toBe(1);
      expect(result.cartItems[0].product).toEqual(product);
    });

    it('성공 케이스, 기존에 카트가 없는 경우, 옵션 o', async () => {
      const sizeOption: OptionGroup = {
        optionName: '사이즈',
        optionType: OptionType.SELECT,
        product: product,
        id: 1
      };
      const colorOption: OptionGroup = {
        optionName: '색상',
        optionType: OptionType.SELECT,
        product: product,
        id: 2
      };
      const optionDetail1: OptionDetail = {
        optionValue: 'XL',
        optionGroup: sizeOption,
        id: 1
      };
      const optionDetail2: OptionDetail = {
        optionValue: '빨강',
        optionGroup: colorOption,
        id: 2
      };
      const cartItemInputWithOption: ItemInput = { 
        productId: 1,
        optionItemInputs: [
          {
          optionQuantity: 1,
          optionDetailIds: [1, 2]
        }
      ]
      };
      const optionDetails: OptionDetail[] = [optionDetail1, optionDetail2];
      
      jest.spyOn(queryRunner.manager, 'getCustomRepository')
        .mockImplementation((repo) => {
          if (repo === MemberRepository)
            return { getByEmail: jest.fn().mockResolvedValue(member) };
          if (repo === ProductRepository)
            return { getById: jest.fn().mockResolvedValue(product) };
          if (repo === CartRepository)
            return {
              getByEmail: jest.fn().mockResolvedValue(null),
              save: jest.fn().mockResolvedValue(cart)
            };
          if (repo === OptionDetailRepository)
            return { getByIds: jest.fn().mockResolvedValue(optionDetails) }
        });

      const result = await service.addToCart(emailInput, cartItemInputWithOption);

      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(result.cartItems.length).toBe(1);
      expect(result.cartItems[0].product).toEqual(product);
    });

    it('실패 케이스, 옵션의 productId와 선택한 productId가 일치하지 않은 경우', async () => {
      const otherProduct: Product = {
        brandName: 'brand2',
        productName: 'product2',
        price: 10,
        salePrice: 10,
        id: 3
      }
      const sizeOption: OptionGroup = {
        optionName: '사이즈',
        optionType: OptionType.SELECT,
        product: otherProduct,
        id: 1
      };
      const colorOption: OptionGroup = {
        optionName: '색상',
        optionType: OptionType.SELECT,
        product: otherProduct,
        id: 2
      };
      const optionDetail1: OptionDetail = {
        optionValue: 'XL',
        optionGroup: sizeOption,
        id: 1
      };
      const optionDetail2: OptionDetail = {
        optionValue: '빨강',
        optionGroup: colorOption,
        id: 2
      };
      const cartItemInputWithOption: ItemInput = { 
        productId: 1,
        optionItemInputs: [
          {
          optionQuantity: 1,
          optionDetailIds: [1, 2]
        }
      ]
      };
      const optionDetails: OptionDetail[] = [optionDetail1, optionDetail2];
      
      jest.spyOn(queryRunner.manager, 'getCustomRepository')
        .mockImplementation((repo) => {
          if (repo === MemberRepository)
            return { getByEmail: jest.fn().mockResolvedValue(member) };
          if (repo === ProductRepository)
            return { getById: jest.fn().mockResolvedValue(product) };
          if (repo === CartRepository)
            return {
              getByEmail: jest.fn().mockResolvedValue(null),
              save: jest.fn().mockResolvedValue(cart)
            };
          if (repo === OptionDetailRepository)
            return { getByIds: jest.fn().mockResolvedValue(optionDetails) }
        });

      await expect(service.addToCart(emailInput, cartItemInputWithOption)).rejects
      .toThrow(new BadRequestException('Not same product, 3 != 1'));
    });

    it('실패 케이스, 수량이 입력되지 않은 경우', async () => {
      const otherProduct: Product = {
        brandName: 'brand2',
        productName: 'product2',
        price: 10,
        salePrice: 10,
        id: 3
      }

      const cartItemInput: ItemInput = { 
        productId: 1
      };
      
      jest.spyOn(queryRunner.manager, 'getCustomRepository')
        .mockImplementation((repo) => {
          if (repo === MemberRepository)
            return { getByEmail: jest.fn().mockResolvedValue(member) };
          if (repo === ProductRepository)
            return { getById: jest.fn().mockResolvedValue(otherProduct) };
          if (repo === CartRepository)
            return {
              getByEmail: jest.fn().mockResolvedValue(null),
              save: jest.fn().mockResolvedValue(cart)
            };
        });

      await expect(service.addToCart(emailInput, cartItemInput)).rejects
      .toThrow(new BadRequestException('quantity is missing.'));
    });

    it('성공 케이스, 기존에 카트가 있는 경우', async () => {
      const cartItem: CartItem = { id: 1, product: product, quantity: quantity };
      const newCartItem: CartItem = { id: 2, product: product, quantity: quantity };
      const addedCart: Cart = { id: 1, member: member, cartItems: [cartItem, newCartItem] };

      jest.spyOn(queryRunner.manager, 'getCustomRepository')
        .mockImplementation((repo) => {
          if (repo === MemberRepository)
            return { getByEmail: jest.fn().mockResolvedValue(member) };
          if (repo === ProductRepository)
            return { getById: jest.fn().mockResolvedValue(product) };
          if (repo === CartRepository)
            return {
              getByEmail: jest.fn().mockResolvedValue(cart),
              save: jest.fn().mockResolvedValue(addedCart)
            };
        });

      const result = await service.addToCart(emailInput, cartItemInput);

      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(result.cartItems.length).toBe(2);
      expect(result.cartItems[1].product).toEqual(product);
    });

    it('인증되지 않은 멤버로 인한 실패 케이스', async () => {
      const unverifiedMember: Member = {
        id: 1, email: 'test@email.com', isVerified: false
      };
      jest.spyOn(members, 'findOne').mockResolvedValue(unverifiedMember as any);

      await expect(members.getByEmail(emailInput.email)).rejects
        .toThrow(
          new BadRequestException('Not verified member, email: test@email.com')
        );
    });

    it('멤버가 존재하지 않아 발생하는 실패 케이스', async () => {
      jest.spyOn(members, 'findOne').mockResolvedValue(null);

      await expect(members.getByEmail(emailInput.email)).rejects
        .toThrow(
          new BadRequestException('Not found member, email: test@email.com')
        );
    });

    it('상품이 존재하지 않아 발생하는 실패 케이스', async () => {
      jest.spyOn(products, 'findOne').mockResolvedValue(null);

      await expect(products.getById(cartItemInput.productId)).rejects
        .toThrow(
          new BadRequestException('Not found product, id: 1')
        );
    });

    it('상품의 판매 상태가 OPEN이 아니라 발생하는 실패 케이스', async () => {
      product.sellingStatus = ServiceProductSellingStatus.SOLDOUT;
      jest.spyOn(products, 'findOne').mockResolvedValue(product);

      await expect(products.getById(cartItemInput.productId)).rejects
        .toThrow(
          new BadRequestException(`Not selling product, 
                id: ${product.id}, status: ${product.sellingStatus}`)
        );
    });
  });

  /**
   * 2. 장바구니 상품 수정 
   * 회원 정보를 검증한다. 
   * - 인증되지 않은 회원이거나 존재하지 않는 회원이면 예외 처리를 한다. (공동 예외이므로 테스트 코드는 패스)
   * 장바구니 상품을 불러온다.
   * - 장바구니 상품이 존재하지 않으면 예외 처리를 한다.  
   * - 장바구니 상품이 판매상태가 OPEN이 아니면 예외 처리를 한다. 
   * 옵션이 있는 상품을 수정할 경우, inputDto에 따라 수정해준다.
   * - 수정하려는 제품이 장바구니에 존재하지 않으면 에러를 발생시킨다. 
   * 장바구니 수량이 입력된 경우, 수량을 수정해준다.
   * 추가로 담는 옵션 상품이 있는 경우, 옵션 상품을 추가해준다. 
   * 모든 수정 내역을 반영하여 장바구니 상품을 수정한다. 
   */
  describe('modifyCartItem', () => {
    const cartItemId = 1;
    const modifyQuantity = 5;
    const emailInput: EmailInput = { email: 'test@email.com' };
    const product: Product = {
      id: 1, productName: 'product1', price: 1000, salePrice: 1000, brandName: 'brand1',
      optionGroups: []
    };
    const modifyCartItemInput: ModifyCartItemInput = { cartItemId: cartItemId, quantity: modifyQuantity };
    const cartItem: CartItem = { id: 1, product: product, quantity: 3, optionItems: [] };
    const optionDetails: OptionDetail[] = [new OptionDetail, new OptionDetail];

    it('성공 케이스, 옵션 x', async () => {
      jest.spyOn(queryRunner.manager, 'getCustomRepository')
        .mockImplementation((repo) => {
          if (repo === MemberRepository)
            return { validateMember: jest.fn().mockResolvedValue(void 0) };
          if (repo === CartItemRepository)
            return {
              getById: jest.fn().mockResolvedValue(cartItem),
              save: jest.fn().mockResolvedValue(cartItem)
            };
        });

      const result = await service.modifyCartItem(emailInput, modifyCartItemInput);

      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(result.quantity).toEqual(modifyQuantity);
    });


    it('성공 케이스, 옵션 o', async () => {
      const modifyCartItemInput: ModifyCartItemInput = 
      { cartItemId: cartItemId, 
        optionItemId: 1, optionQuantity: 5, 
        optionItemInputs: [{optionQuantity: 3, optionDetailIds: [1, 2]}] };
      const optionItem: OptionItem = {
        isDeleted: false,
        optionQuantity: 2,
        id: 1,
        cartItem: cartItem
      };
      const cartItemWithOption = {...cartItem, optionItems: [optionItem]}
      
      jest.spyOn(queryRunner.manager, 'getCustomRepository')
        .mockImplementation((repo) => {
          if (repo === MemberRepository)
            return { validateMember: jest.fn().mockResolvedValue(void 0) };
          if (repo === CartItemRepository)
            return {
              getById: jest.fn().mockResolvedValue(cartItemWithOption),
              save: jest.fn().mockResolvedValue(cartItemWithOption)
            };
          if (repo === OptionItemRepository)
            return {
              getById: jest.fn().mockResolvedValue(optionItem)
            };
          if (repo === OptionDetailRepository) 
            return {
              getByIds: jest.fn().mockResolvedValue(optionDetails)
            }
        });

      const result = await service.modifyCartItem(emailInput, modifyCartItemInput);

      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(result.optionItems[0].optionQuantity).toEqual(5);
    });

    it('장바구니 상품이 존재하지 않아 발생하는 실패 케이스', async () => {
      jest.spyOn(cartItems, 'findOne').mockResolvedValue(null);

      await expect(cartItems.getById(cartItemId)).rejects
        .toThrow(
          new BadRequestException('Not found cart item, id: 1')
        );
    });

    it('장바구니 상품의 판매 상태가 OPEN이 아니라 발생하는 실패 케이스', async () => {
      product.sellingStatus = ServiceProductSellingStatus.SOLDOUT;
      jest.spyOn(cartItems, 'findOne').mockResolvedValue(cartItem);

      await expect(cartItems.getById(cartItemId)).rejects
        .toThrow(
          new BadRequestException(`Not selling product, 
                cartItemId: ${cartItemId}, status: ${cartItem.product.sellingStatus}`)
        );
    });
  })

  /**
  * 3. 장바구니 상품 삭제(복수 선택 가능)
  * 회원 정보를 검증한다. 
  * - 인증되지 않은 회원이거나 존재하지 않는 회원이면 예외 처리를 한다. (공동 예외이므로 테스트 코드는 패스)
  * 장바구니 상품을 불러온다.
  * - 장바구니 상품이 존재하지 않으면 예외 처리를 한다.
  * 장바구니 상품의 isDeleted 속성을 true로 변경한다. 
  */
  describe('deleteCartItems', () => {
    const emailInput: EmailInput = { email: 'test@email.com' };
    const product: Product = {
      id: 1, productName: 'product1', price: 1000, salePrice: 1000, brandName: 'brand1',
      optionGroups: []
    };
    const cartItemsInput: CartItemsInput = { itemIds: [1, 2] };
    const cartItem1: CartItem = { id: 1, product: product, quantity: 3 };
    const cartItem2: CartItem = { id: 2, product: product, quantity: 3 };
    const member: Member = { id: 1, email: emailInput.email }
    const cart: Cart = { id: 1, member: member, cartItems: [cartItem1, cartItem2] };
    const existedcartItems: CartItem[] = [cartItem1, cartItem2];

    it('성공 케이스', async () => {
      const saveMock = jest.fn(); // save 메서드를 모킹
      jest.spyOn(queryRunner.manager, 'getCustomRepository')
        .mockImplementation((repo) => {
          if (repo === MemberRepository)
            return { validateMember: jest.fn().mockResolvedValue(void 0) };
          if (repo === CartItemRepository)
            return {
              getByIds: jest.fn().mockResolvedValue(existedcartItems),
              save: saveMock
            };
        });

      await service.deleteCartItems(emailInput, cartItemsInput);

      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(cart.cartItems[0].isDeleted).toEqual(true);
      expect(cart.cartItems[1].isDeleted).toEqual(true);
      expect(saveMock).toHaveBeenCalledTimes(existedcartItems.length);
      expect(saveMock).toHaveBeenCalledWith(existedcartItems[0]);
      expect(saveMock).toHaveBeenCalledWith(existedcartItems[1]);
    });


    it('장바구니 상품이 존재하지 않아 발생하는 실패 케이스', async () => {
      cartItem1.isDeleted = true;
      cartItem2.isDeleted = true;
      jest.spyOn(cartItems, 'find').mockResolvedValue(null);

      await expect(cartItems.getByIds(cartItemsInput.itemIds)).rejects
        .toThrow(
          new BadRequestException(`Not found cart items, idList: ${cartItemsInput.itemIds}`)
        );
    });
  })

});
