import { assert, expect } from "chai";
import { ethers, upgrades } from "hardhat";
import type { BigNumber, Signature, Wallet } from "ethers";
import { NFT, RentalPrice, LendOrder, RentOffer, TokenType, ISignature, SignatureVersion, Metadata } from "./IStructs";
import { types_rentOffer, types_lendOrder } from "./types";
import { domain } from "process";
import hre from "hardhat";
const firstTokenId = 1;
const secondTokenId = 2;



describe("TestMarket 4907", function () {
    let ownerOfMarket, adminOfMarket, ownerOfNFT, renterA, renterB, other;
    let erc20;
    let bank;
    let market;
    let testERC4907;
    let receipt = null;
    let domain;
    let timestamp;
    let maxRentExpiry;
    let nft: NFT;
    let rentalPrice_ETH: RentalPrice;
    let lendOrder: LendOrder;
    let rentOffer: RentOffer;
    let typedDataEncoder_lendOrder;
    let typedDataEncoder_rentOffer;
    let sig: Signature;
    let iSig: ISignature;
    let metadata: Metadata;
    let metadataChecker721;
    beforeEach(async function () {
        [ownerOfMarket, adminOfMarket, ownerOfNFT, renterA, renterB, other] = await ethers.getSigners();

        const TestERC20 = await ethers.getContractFactory("TestERC20");
        erc20 = await TestERC20.deploy('', '', 6);

        const WrappedInERC4907Upgradeable = await ethers.getContractFactory("WrappedInERC4907Upgradeable");
        let w4907 = await WrappedInERC4907Upgradeable.deploy();

        const MetadataChecker721 = await ethers.getContractFactory("MetadataChecker721");
        metadataChecker721 = await MetadataChecker721.deploy();

        const Bank721 = await ethers.getContractFactory("Bank721");
        bank = await upgrades.deployProxy(Bank721, [ownerOfMarket.address, adminOfMarket.address, w4907.address], { unsafeAllow: ['delegatecall','constructor'] });

        const RentalMarket721 = await ethers.getContractFactory("RentalMarket721");
        market = await RentalMarket721.deploy();
        market = await upgrades.deployProxy(RentalMarket721, [ownerOfMarket.address, adminOfMarket.address, bank.address], { unsafeAllow: ['delegatecall','constructor'] });

        const TestERC4907 = await ethers.getContractFactory("TestERC4907");
        testERC4907 = await TestERC4907.deploy();

        await testERC4907.mint(ownerOfNFT.address, firstTokenId)
        await testERC4907.mint(ownerOfNFT.address, secondTokenId)

        await testERC4907.connect(ownerOfNFT).setApprovalForAll(bank.address, true);

        typedDataEncoder_lendOrder = ethers.utils._TypedDataEncoder.from(types_lendOrder);
        typedDataEncoder_rentOffer = ethers.utils._TypedDataEncoder.from(types_rentOffer);

        //准备基础测试数据

        const chainId = (await ethers.provider.getNetwork()).chainId;
        console.log("----chainId----", chainId);
        // All properties on a domain are optional
        domain = {
            name: 'Double',
            version: '1.0.0',
            chainId: chainId,
            verifyingContract: market.address
        };

        const blockNumBefore = await ethers.provider.getBlockNumber();
        const blockBefore = await ethers.provider.getBlock(blockNumBefore);
        timestamp = blockBefore.timestamp;
        maxRentExpiry = timestamp + 8640000;
        nft = { tokenType: TokenType.ERC4907, token: testERC4907.address, tokenId: firstTokenId, amount: 1 }
        rentalPrice_ETH = { paymentToken: ethers.constants.AddressZero, pricePerCycle: ethers.utils.parseEther('1'), cycle: 86400 }
        //metadata
        let tokenURI = await testERC4907.tokenURI(firstTokenId);
        let encode_local = ethers.utils.defaultAbiCoder.encode(['string'], [tokenURI]);
        let metadataHash_local = ethers.utils.solidityKeccak256(['bytes'], [encode_local]);
        metadata = { checker: metadataChecker721.address, metadataHash: metadataHash_local }

        lendOrder = {
            maker: ownerOfNFT.address,
            taker: ethers.constants.AddressZero,
            nft: nft,
            price: rentalPrice_ETH,
            minCycleAmount: 1,
            maxRentExpiry: maxRentExpiry,
            nonce: 0,
            salt: 0,
            durationId: ethers.constants.MaxUint256,
            fees: [{ rate: 100, recipient: ownerOfMarket.address }],
            metadata: metadata
        }








    })

    describe('ERC4907', function () {

        beforeEach(async function () {
            // 创建订单并签名
            // let order_hash_to_sign_local = ethers.utils._TypedDataEncoder.hash(domain, types, rentalOrder);
            // let order_hash_local = typedDataEncoder_rentalOrder.hashStruct('LendOrder', rentalOrder);
            // let order_hash_to_sign_chain = await eip712._getEIP712Hash(order_hash_local);
            // expect(order_hash_to_sign_local).equal(order_hash_to_sign_chain);

        });
        // it("_getEIP712Hash vs _TypedDataEncoder.hash", async function () {
        //     let order_hash_to_sign_local = ethers.utils._TypedDataEncoder.hash(domain, types_lendOrder, lendOrder);
        //     let order_hash_local = typedDataEncoder_lendOrder.hashStruct('LendOrder', lendOrder);
        //     let order_hash_to_sign_chain = await market._getEIP712Hash(order_hash_local);
        //     expect(order_hash_to_sign_local).equal(order_hash_to_sign_chain);
        // });

        it("fulfillLendOrder721", async function () {
            let flatSig = await ownerOfNFT._signTypedData(domain, types_lendOrder, lendOrder);
            let addr = ethers.utils.verifyTypedData(domain, types_lendOrder, lendOrder, flatSig);
            expect(addr).equal(ownerOfNFT.address)
            sig = ethers.utils.splitSignature(flatSig);
            iSig = {
                signature: sig.compact,
                signatureVersion: SignatureVersion.EIP712
            }
            receipt = await market.connect(renterA).fulfillLendOrder721(lendOrder, iSig, 10, { value: ethers.utils.parseEther('10') });

            let user = await testERC4907.userOf(firstTokenId);
            let userExpires = await testERC4907.userExpires(firstTokenId);

            let rentExpiry = timestamp + 86400 * 10;
            expect(user).equal(renterA.address);
            expect(userExpires).gte(rentExpiry)
            expect(await testERC4907.ownerOf(firstTokenId)).equal(bank.address);

            let subletOrder: LendOrder = {
                maker: renterA.address,
                taker: ethers.constants.AddressZero,
                nft: nft,
                price: rentalPrice_ETH,
                minCycleAmount: 1,
                maxRentExpiry: maxRentExpiry,
                nonce: 0,
                salt: 0,
                durationId: userExpires,
                fees: [{ rate: 100, recipient: ownerOfMarket.address }],
                metadata: metadata
            }

            let flatSig_sublet = await renterA._signTypedData(domain, types_lendOrder, subletOrder);
            let addr_sublet = ethers.utils.verifyTypedData(domain, types_lendOrder, subletOrder, flatSig_sublet);
            expect(addr_sublet).equal(renterA.address)
            sig = ethers.utils.splitSignature(flatSig_sublet);
            iSig = {
                signature: sig.compact,
                signatureVersion: SignatureVersion.EIP712
            }
            receipt = await market.connect(renterB).fulfillLendOrder721(subletOrder, iSig, 1, { value: ethers.utils.parseEther('1') });

            expect(await testERC4907.userOf(firstTokenId)).equal(renterB.address)

        });

        // it("cancelOrder", async function () {
        //     receipt = await market.connect(ownerOfNFT).transfer_721_default_2(testERC4907.address, firstTokenId, owner.address, to.address);
        // });

    });

    describe('ERC721-redeem', function () {
        let rentalPrice_ERC20;
        beforeEach(async function () {
            rentalPrice_ERC20 = { paymentToken: erc20.address, pricePerCycle: ethers.utils.parseEther('1'), cycle: 86400 }
            lendOrder = {
                maker: ownerOfNFT.address,
                taker: ethers.constants.AddressZero,
                nft: nft,
                price: rentalPrice_ERC20,
                minCycleAmount: 1,
                maxRentExpiry: maxRentExpiry,
                nonce: 0,
                salt: 0,
                durationId: ethers.constants.MaxUint256,
                fees: [{ rate: 100, recipient: ownerOfMarket.address }],
                metadata: metadata
            }

            erc20.mint(renterA.address, ethers.utils.parseEther('100'));
            erc20.mint(renterB.address, ethers.utils.parseEther('1'));

            erc20.connect(renterA).approve(market.address, ethers.utils.parseEther('100'));
            erc20.connect(renterB).approve(market.address, ethers.utils.parseEther('100'));

            let flatSig = await ownerOfNFT._signTypedData(domain, types_lendOrder, lendOrder);
            let addr = ethers.utils.verifyTypedData(domain, types_lendOrder, lendOrder, flatSig);
            expect(addr).equal(ownerOfNFT.address)
            sig = ethers.utils.splitSignature(flatSig);
            iSig = {
                signature: sig.compact,
                signatureVersion: SignatureVersion.EIP712
            }
            if (lendOrder.price.paymentToken == ethers.constants.AddressZero) {
                receipt = await market.connect(renterA).fulfillLendOrder721(lendOrder, iSig, 10, { value: ethers.utils.parseEther('10') });
            } else {
                receipt = await market.connect(renterA).fulfillLendOrder721(lendOrder, iSig, 10);
            }
        });

        it("redeem should success if user is expired", async function () {
            await hre.network.provider.send("hardhat_mine", ["0x15180", "0xa0"]);//86400 * 10
            await bank.connect(ownerOfNFT).redeemNFT721(TokenType.ERC4907, testERC4907.address, firstTokenId);
            expect(await testERC4907.ownerOf(firstTokenId)).equal(ownerOfNFT.address);
        });
        it("redeem should failed if user isn't expired", async function () {
            await expect(bank.connect(ownerOfNFT).redeemNFT721(TokenType.ERC4907, testERC4907.address, firstTokenId)).to.be.revertedWith("cannot redeem now");
        });
    });





});

