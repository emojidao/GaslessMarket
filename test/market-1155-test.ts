import { assert, expect } from "chai";
import { ethers, upgrades } from "hardhat";
import type { BigNumber, Signature, Wallet } from "ethers";
import { NFT, RentalPrice, LendOrder, RentOffer, TokenType, ISignature, SignatureVersion, Metadata, IRentingRecord } from "./IStructs";
import { types_rentOffer, types_lendOrder } from "./types";
import { domain } from "process";
import hre from "hardhat";
const firstTokenId = 1;
const secondTokenId = 2;



describe("TestMarket 1155", function () {
    let ownerOfMarket, adminOfMarket, ownerOfNFT, renterA, renterB;
    let erc20;
    let bank;
    let market;
    let testERC1155;
    let w5006_test;
    let receipt = null;
    let domain;
    let maxRentExpiry;
    let rentOfferExpiry;
    let nft: NFT;
    let rentalPrice_ETH: RentalPrice;
    let lendOrder: LendOrder;

    let typedDataEncoder_lendOrder;
    let typedDataEncoder_rentOrder;
    let sig: Signature;
    let iSig: ISignature;

    let metadata: Metadata;
    let metadataChecker1155;

    beforeEach(async function () {
        [ownerOfMarket, adminOfMarket, ownerOfNFT, renterA, renterB] = await ethers.getSigners();

        const MetadataChecker1155 = await ethers.getContractFactory("MetadataChecker1155");
        metadataChecker1155 = await MetadataChecker1155.deploy();

        const TestERC20 = await ethers.getContractFactory("TestERC20");
        erc20 = await TestERC20.deploy('', '', 6);

        const WrappedInERC5006 = await ethers.getContractFactory("WrappedInERC5006");
        let w5006Impl = await WrappedInERC5006.deploy();

        const Bank1155 = await ethers.getContractFactory("Bank1155");
        bank = await upgrades.deployProxy(Bank1155, [ownerOfMarket.address, adminOfMarket.address, w5006Impl.address], { unsafeAllow: ['delegatecall'] });

        const RentalMarket1155 = await ethers.getContractFactory("RentalMarket1155");
        market = await RentalMarket1155.deploy();
        market = await upgrades.deployProxy(RentalMarket1155, [ownerOfMarket.address, adminOfMarket.address, bank.address], { unsafeAllow: ['delegatecall'] });

        const TestERC1155 = await ethers.getContractFactory("TestERC1155");
        testERC1155 = await TestERC1155.deploy();

        await deployW5006();

        await testERC1155.mint(ownerOfNFT.address, firstTokenId, 100)
        await testERC1155.mint(ownerOfNFT.address, secondTokenId, 100)

        await testERC1155.connect(ownerOfNFT).setApprovalForAll(w5006_test.address, true);
        await testERC1155.connect(ownerOfNFT).setApprovalForAll(bank.address, true);

        typedDataEncoder_lendOrder = ethers.utils._TypedDataEncoder.from(types_lendOrder);
        typedDataEncoder_rentOrder = ethers.utils._TypedDataEncoder.from(types_rentOffer);

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
        const timestamp = blockBefore.timestamp;
        maxRentExpiry = timestamp + 8640000;
        rentOfferExpiry = timestamp + 8640000;
        nft = { tokenType: TokenType.ERC1155, token: testERC1155.address, tokenId: firstTokenId, amount: 100 }
        rentalPrice_ETH = { paymentToken: ethers.constants.AddressZero, pricePerCycle: ethers.utils.parseEther('1'), cycle: 86400 }
        //metadata
        let tokenURI = await testERC1155.uri(firstTokenId);
        let encode_local = ethers.utils.defaultAbiCoder.encode(['string'], [tokenURI]);
        let metadataHash_local = ethers.utils.solidityKeccak256(['bytes'], [encode_local]);
        metadata = { checker: metadataChecker1155.address, metadataHash: metadataHash_local }

    })

    async function deployW5006() {
        let tx = await bank.deployW5006(testERC1155.address);
        let receipt = await tx.wait();
        // console.log('receipt',receipt);
        let event = receipt.events[1]
        assert.equal(event.eventSignature, 'DeployW5006(address,address)');
        w5006_test = await ethers.getContractAt("WrappedInERC5006", event.args[0]);
    }


    describe('ERC1155-fulfillLendOrder1155', function () {
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
            erc20.mint(renterB.address, ethers.utils.parseEther('100'));

            erc20.connect(renterA).approve(market.address, ethers.utils.parseEther('100'));
            erc20.connect(renterB).approve(market.address, ethers.utils.parseEther('100'));

        });
        it("_getEIP712Hash vs _TypedDataEncoder.hash", async function () {
            let order_hash_to_sign_local = ethers.utils._TypedDataEncoder.hash(domain, types_lendOrder, lendOrder);
            let order_hash_local = typedDataEncoder_lendOrder.hashStruct('LendOrder', lendOrder);
            let order_hash_to_sign_chain = await market._getEIP712Hash(order_hash_local);
            expect(order_hash_to_sign_local).equal(order_hash_to_sign_chain);
        });

        it("fulfillLendOrder1155 success", async function () {
            let flatSig = await ownerOfNFT._signTypedData(domain, types_lendOrder, lendOrder);
            let addr = ethers.utils.verifyTypedData(domain, types_lendOrder, lendOrder, flatSig);
            expect(addr).equal(ownerOfNFT.address)
            sig = ethers.utils.splitSignature(flatSig);
            iSig = {
                signature: sig.compact,
                signatureVersion: SignatureVersion.EIP712
            }
            if (lendOrder.price.paymentToken == ethers.constants.AddressZero) {
                receipt = await market.connect(renterA).fulfillLendOrder1155(lendOrder, iSig, 10, 1, [], { value: ethers.utils.parseEther('10') });
            } else {
                receipt = await market.connect(renterA).fulfillLendOrder1155(lendOrder, iSig, 10, 1, []);
            }

            let order_hash_local = typedDataEncoder_lendOrder.hashStruct('LendOrder', lendOrder);
            await receipt.wait();
            let record = await w5006_test.userRecordOf(1);
            await expect(receipt).to.emit(market, "LendOrderFulfilled")
            await expect(receipt).to.emit(w5006_test, "CreateUserRecord").withArgs(1, firstTokenId, 10, bank.address, renterA.address, record[4]);


            await hre.network.provider.send("hardhat_mine", ["0x15180", "0x1"]);//86400 * 1

            let toDeletes: IRentingRecord[] = [];
            toDeletes.push({
                tokenType: TokenType.ERC1155,
                oNFT: testERC1155.address,
                oNFTId: firstTokenId,
                recordId: 1,
                lender: ownerOfNFT.address
            })

            if (lendOrder.price.paymentToken == ethers.constants.AddressZero) {
                receipt = await market.connect(renterB).fulfillLendOrder1155(lendOrder, iSig, 10, 1, toDeletes, { value: ethers.utils.parseEther('10') });
            } else {
                receipt = await market.connect(renterB).fulfillLendOrder1155(lendOrder, iSig, 10, 1, toDeletes);
            }

        });


    });

    describe('ERC1155-fulfillRentOffer1155', function () {
        let rentOffer_A: RentOffer;
        let rentOffer_B: RentOffer;
        let rentalPrice_ERC20;
        beforeEach(async function () {
            let nft_rent = { tokenType: TokenType.ERC1155, token: testERC1155.address, tokenId: firstTokenId, amount: 10 }
            rentalPrice_ERC20 = { paymentToken: erc20.address, pricePerCycle: ethers.utils.parseEther('1'), cycle: 86400 }
            rentOffer_A = {
                maker: renterA.address,
                taker: ethers.constants.AddressZero,
                nft: nft_rent,
                price: rentalPrice_ERC20,
                cycleAmount: 10,
                offerExpiry: rentOfferExpiry,
                nonce: 0,
                salt: 0,
                fees: [{ rate: 100, recipient: ownerOfMarket.address }],
                metadata: metadata
            }
            rentOffer_B = {
                maker: renterB.address,
                taker: ethers.constants.AddressZero,
                nft: nft_rent,
                price: rentalPrice_ERC20,
                cycleAmount: 5,
                offerExpiry: rentOfferExpiry,
                nonce: 0,
                salt: 0,
                fees: [{ rate: 100, recipient: ownerOfMarket.address }],
                metadata: metadata
            }

            erc20.mint(renterA.address, ethers.utils.parseEther('100'));
            erc20.mint(renterB.address, ethers.utils.parseEther('100'));

            erc20.connect(renterA).approve(market.address, ethers.utils.parseEther('100'));
            erc20.connect(renterB).approve(market.address, ethers.utils.parseEther('100'));

        });
        it("_getEIP712Hash vs _TypedDataEncoder.hash", async function () {
            let order_hash_to_sign_local = ethers.utils._TypedDataEncoder.hash(domain, types_rentOffer, rentOffer_A);
            let order_hash_local = typedDataEncoder_rentOrder.hashStruct('RentOffer', rentOffer_A);
            let order_hash_to_sign_chain = await market._getEIP712Hash(order_hash_local);
            expect(order_hash_to_sign_local).equal(order_hash_to_sign_chain);
        });

        it("fulfillRentOffer1155 success", async function () {
            let flatSig = await renterA._signTypedData(domain, types_rentOffer, rentOffer_A);
            let addr = ethers.utils.verifyTypedData(domain, types_rentOffer, rentOffer_A, flatSig);
            expect(addr).equal(renterA.address)
            sig = ethers.utils.splitSignature(flatSig);
            iSig = {
                signature: sig.compact,
                signatureVersion: SignatureVersion.EIP712
            }
            receipt = await market.connect(ownerOfNFT).fulfillRentOffer1155(rentOffer_A, iSig, []);


            await hre.network.provider.send("hardhat_mine", ["0x15180", "0xb"]);//86400 * 11
            let record_a = await w5006_test.userRecordOf(1);
            expect(record_a.owner).equal(bank.address);

            let flatSig_sublet = await renterB._signTypedData(domain, types_rentOffer, rentOffer_B);
            let addr_sublet = ethers.utils.verifyTypedData(domain, types_rentOffer, rentOffer_B, flatSig_sublet);
            expect(addr_sublet).equal(renterB.address)
            sig = ethers.utils.splitSignature(flatSig_sublet);
            iSig = {
                signature: sig.compact,
                signatureVersion: SignatureVersion.EIP712
            }

            let toDeletes: IRentingRecord[] = [];
            toDeletes.push({
                tokenType: TokenType.ERC1155,
                oNFT: testERC1155.address,
                oNFTId: firstTokenId,
                recordId: 1,
                lender: ownerOfNFT.address
            })
            receipt = await market.connect(ownerOfNFT).fulfillRentOffer1155(rentOffer_B, iSig, toDeletes);


        });

        // it("cancelOrder", async function () {
        //     receipt = await market.connect(ownerOfNFT).transfer_1155_default_2(testERC1155.address, firstTokenId, owner.address, to.address);
        // });

    });



});

