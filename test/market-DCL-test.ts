import { assert, expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { BigNumber, providers, Signature, Wallet } from "ethers";
import { NFT, RentalPrice, LendOrder, RentOffer, TokenType, ISignature, SignatureVersion, Metadata } from "./IStructs";
import { types_rentOffer, types_lendOrder } from "./types";
import { domain } from "process";
import hre from "hardhat";
let firstTokenId = 1;
let secondTokenId = 2;
const nonexsitTokenId = 10000000;



describe("TestMarket 721 DCL", function () {
    let ownerOfMarket, adminOfMarket, ownerOfNFT, renterA, renterB, other;
    let erc20;
    let bank_dcl;
    let market;
    let testERC721;
    // let w4907_test;
    let receipt = null;
    let domain;
    let timestamp;
    let maxRentExpiry;
    let rentOfferExpiry;
    let nft: NFT;
    let rentalPrice_ETH: RentalPrice;
    let lendOrder: LendOrder;

    let typedDataEncoder_lendOrder;
    let typedDataEncoder_rentOffer;
    let sig: Signature;
    let iSig: ISignature;

    let metadata: Metadata;
    let metadataChecker721;

    beforeEach(async function () {
        [ownerOfMarket, adminOfMarket, ownerOfNFT, renterA, renterB, other] = await ethers.getSigners();

        const MetadataChecker721 = await ethers.getContractFactory("MetadataChecker721");
        metadataChecker721 = await MetadataChecker721.deploy();

        const TestERC20 = await ethers.getContractFactory("TestERC20");
        erc20 = await TestERC20.deploy('', '', 6);

        const WrappedInERC4907Upgradeable = await ethers.getContractFactory("WrappedInERC4907Upgradeable");
        let w4907 = await WrappedInERC4907Upgradeable.deploy();

        

        const Bank721 = await ethers.getContractFactory("Bank721");
        let bank721 = await Bank721.deploy(ownerOfMarket.address, adminOfMarket.address, w4907.address);

        const RentalMarket721 = await ethers.getContractFactory("RentalMarket721");
        market = await RentalMarket721.deploy();
        market = await upgrades.deployProxy(RentalMarket721, [ownerOfMarket.address, adminOfMarket.address, bank721.address], { unsafeAllow: ['delegatecall'] });

        const LANDRegistry = await ethers.getContractFactory("contracts/test/dcl/LANDRegistry.sol:LANDRegistry");
        testERC721 = await LANDRegistry.deploy();

        const BankDCL = await ethers.getContractFactory("BankDCL");
        bank_dcl = await BankDCL.deploy(ownerOfMarket.address, adminOfMarket.address);
        await market.registerBank(testERC721.address, bank_dcl.address);
        
        firstTokenId = await testERC721._unsafeEncodeTokenId(100, 100);
        secondTokenId = await testERC721._unsafeEncodeTokenId(100, 101);
        await testERC721.updateWhiteListMap([ownerOfMarket.address],true);
        await testERC721.assignNewParcel(100, 100, ownerOfNFT.address)
        await testERC721.assignNewParcel(100, 101, ownerOfNFT.address)

        await testERC721.connect(ownerOfNFT).setApprovalForAll(bank_dcl.address, true);

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
        maxRentExpiry = timestamp + 86400 * 180;
        rentOfferExpiry = timestamp + 86400 * 180;
        nft = { tokenType: TokenType.ERC721, token: testERC721.address, tokenId: firstTokenId, amount: 1 }
        rentalPrice_ETH = { paymentToken: ethers.constants.AddressZero, pricePerCycle: ethers.utils.parseEther('1'), cycle: 86400 }
        //metadata
        let tokenURI = await testERC721.tokenURI(firstTokenId);
        let encode_local = ethers.utils.defaultAbiCoder.encode(['string'], [tokenURI]);
        let metadataHash_local = ethers.utils.solidityKeccak256(['bytes'], [encode_local]);
        metadata = { checker: metadataChecker721.address, metadataHash: metadataHash_local }

    })


    describe('ERC721-fulfillLendOrder721', function () {
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

        });
        it("_getEIP712Hash vs _TypedDataEncoder.hash", async function () {
            let order_hash_to_sign_local = ethers.utils._TypedDataEncoder.hash(domain, types_lendOrder, lendOrder);
            let order_hash_local = typedDataEncoder_lendOrder.hashStruct('LendOrder', lendOrder);
            let order_hash_to_sign_chain = await market._getEIP712Hash(order_hash_local);
            expect(order_hash_to_sign_local).equal(order_hash_to_sign_chain);
        });

        it("fulfillLendOrder721 should succeed", async function () {
            let flatSig = await ownerOfNFT._signTypedData(domain, types_lendOrder, lendOrder);
            let addr = ethers.utils.verifyTypedData(domain, types_lendOrder, lendOrder, flatSig);
            expect(addr).equal(ownerOfNFT.address)
            sig = ethers.utils.splitSignature(flatSig);
            iSig = {
                signature:sig.compact,
                signatureVersion: SignatureVersion.EIP712
            }
            if (lendOrder.price.paymentToken == ethers.constants.AddressZero) {
                receipt = await market.connect(renterA).fulfillLendOrder721(lendOrder, iSig, 10, { value: ethers.utils.parseEther('10') });
            } else {
                receipt = await market.connect(renterA).fulfillLendOrder721(lendOrder, iSig, 10);
            }

            let data = await bank_dcl.userInfoOf(TokenType.ERC721,testERC721.address, firstTokenId);
            let rentExpiry = timestamp + 86400 * 10;
            console.log('data',data);
            
            let checkInData = await bank_dcl.checkInOf(testERC721.address, firstTokenId);
            console.log('checkInData',checkInData);
            
            expect(data[0]).equal(renterA.address);
            expect(data[1]).gte(rentExpiry)
            expect(await testERC721.ownerOf(firstTokenId)).equal(bank_dcl.address);


            let subletOrder: LendOrder = {
                maker: renterA.address,
                taker: ethers.constants.AddressZero,
                nft: nft,
                price: rentalPrice_ETH,
                minCycleAmount: 1,
                maxRentExpiry: maxRentExpiry,
                nonce: 0,
                salt: 0,
                durationId: data[1],
                fees: [{ rate: 100, recipient: ownerOfMarket.address }],
                metadata: metadata
            }

            let flatSig_sublet = await renterA._signTypedData(domain, types_lendOrder, subletOrder);
            let addr_sublet = ethers.utils.verifyTypedData(domain, types_lendOrder, subletOrder, flatSig_sublet);
            expect(addr_sublet).equal(renterA.address)
            sig = ethers.utils.splitSignature(flatSig_sublet);
            iSig = {
                signature:sig.compact,
                signatureVersion: SignatureVersion.EIP712
            }
            if (subletOrder.price.paymentToken == ethers.constants.AddressZero) {
                receipt = await market.connect(renterB).fulfillLendOrder721(subletOrder, iSig, 1, { value: ethers.utils.parseEther('1') });
            } else {
                receipt = await market.connect(renterB).fulfillLendOrder721(subletOrder, iSig, 1);
            }

            let data_renterB = await bank_dcl.userInfoOf(TokenType.ERC721,testERC721.address, firstTokenId);
            console.log('user', data_renterB[0]);
            console.log('userExpires', data_renterB[1]);

            expect(data_renterB[0]).equal(renterB.address)

        });
        it("fulfillLendOrder721 should failed if struct is signed by other", async function () {
            let flatSig_other = await other._signTypedData(domain, types_lendOrder, lendOrder);
            sig = ethers.utils.splitSignature(flatSig_other);
            let iSig_by_other = {
                signature:sig.compact,
                signatureVersion: SignatureVersion.EIP712
            }
            if (lendOrder.price.paymentToken == ethers.constants.AddressZero) {
                await expect(market.connect(renterA).fulfillLendOrder721(lendOrder, iSig_by_other, 10, { value: ethers.utils.parseEther('10') })).to.be.reverted;
            } else {
                await expect(market.connect(renterA).fulfillLendOrder721(lendOrder, iSig_by_other, 10)).to.be.reverted;
            }
        });
        it("fulfillLendOrder721 should failed if struct is signed by other", async function () {
            lendOrder.price = rentalPrice_ETH;
            let flatSig_other = await other._signTypedData(domain, types_lendOrder, lendOrder);
            sig = ethers.utils.splitSignature(flatSig_other);
            let iSig_by_other = {
                signature:sig.compact,
                signatureVersion: SignatureVersion.EIP712
            }
            if (lendOrder.price.paymentToken == ethers.constants.AddressZero) {
                await expect(market.connect(renterA).fulfillLendOrder721(lendOrder, iSig_by_other, 10, { value: ethers.utils.parseEther('10') })).to.be.reverted;
            } else {
                await expect(market.connect(renterA).fulfillLendOrder721(lendOrder, iSig_by_other, 10)).to.be.reverted;
            }
        });
        it("fulfillLendOrder721 should failed if renter don't have enough ETH", async function () {
            lendOrder.price = rentalPrice_ETH;
            let flatSig = await ownerOfNFT._signTypedData(domain, types_lendOrder, lendOrder);
            let addr = ethers.utils.verifyTypedData(domain, types_lendOrder, lendOrder, flatSig);
            expect(addr).equal(ownerOfNFT.address)
            sig = ethers.utils.splitSignature(flatSig);
            iSig = {
                signature:sig.compact,
                signatureVersion: SignatureVersion.EIP712
            }
            if (lendOrder.price.paymentToken == ethers.constants.AddressZero) {
                await expect(market.connect(renterB).fulfillLendOrder721(lendOrder, iSig, 10, { value: ethers.utils.parseEther('9.9') })).to.be.revertedWith("payment is not enough");
            } else {
                await expect(market.connect(renterB).fulfillLendOrder721(lendOrder, iSig, 10)).to.be.revertedWith("payment is not enough");
            }
        });
        it("fulfillLendOrder721 should failed if renter don't have enough ERC20", async function () {
            let flatSig = await ownerOfNFT._signTypedData(domain, types_lendOrder, lendOrder);
            let addr = ethers.utils.verifyTypedData(domain, types_lendOrder, lendOrder, flatSig);
            expect(addr).equal(ownerOfNFT.address)
            sig = ethers.utils.splitSignature(flatSig);
            iSig = {
                signature:sig.compact,
                signatureVersion: SignatureVersion.EIP712
            }
            if (lendOrder.price.paymentToken == ethers.constants.AddressZero) {
                await expect(market.connect(renterB).fulfillLendOrder721(lendOrder, iSig, 10, { value: ethers.utils.parseEther('9.9') })).to.be.revertedWith("payment is not enough");
            } else {
                await expect(market.connect(renterB).fulfillLendOrder721(lendOrder, iSig, 10)).to.be.revertedWith("ERC20: transfer amount exceeds balance");
            }
        });
        it("fulfillLendOrder721 should failed if renter don't approve enough ERC20", async function () {
            await erc20.mint(renterB.address, ethers.utils.parseEther('99'));
            await erc20.connect(renterB).approve(market.address, ethers.utils.parseEther('0'));
            let flatSig = await ownerOfNFT._signTypedData(domain, types_lendOrder, lendOrder);
            let addr = ethers.utils.verifyTypedData(domain, types_lendOrder, lendOrder, flatSig);
            expect(addr).equal(ownerOfNFT.address)
            sig = ethers.utils.splitSignature(flatSig);
            iSig = {
                signature:sig.compact,
                signatureVersion: SignatureVersion.EIP712
            }
            if (lendOrder.price.paymentToken == ethers.constants.AddressZero) {
                await expect(market.connect(renterB).fulfillLendOrder721(lendOrder, iSig, 10, { value: ethers.utils.parseEther('9.9') })).to.be.revertedWith("payment is not enough");
            } else {
                await expect(market.connect(renterB).fulfillLendOrder721(lendOrder, iSig, 10)).to.be.revertedWith("ERC20: insufficient allowance");
            }
        });

        it("fulfillLendOrder721 should failed if lender list nonexsit NFT", async function () {
            lendOrder.nft.tokenId = nonexsitTokenId;
            let flatSig = await ownerOfNFT._signTypedData(domain, types_lendOrder, lendOrder);
            let addr = ethers.utils.verifyTypedData(domain, types_lendOrder, lendOrder, flatSig);
            expect(addr).equal(ownerOfNFT.address)
            sig = ethers.utils.splitSignature(flatSig);
            iSig = {
                signature:sig.compact,
                signatureVersion: SignatureVersion.EIP712
            }
            if (lendOrder.price.paymentToken == ethers.constants.AddressZero) {
                await expect(market.connect(renterA).fulfillLendOrder721(lendOrder, iSig, 10, { value: ethers.utils.parseEther('9.9') })).to.be.reverted;
            } else {
                await expect(market.connect(renterA).fulfillLendOrder721(lendOrder, iSig, 10)).to.be.reverted;
            }
        });

        it("fulfillLendOrder721 should failed if cycleAmount < minCycleAmount", async function () {
            lendOrder.minCycleAmount = 10;
            let flatSig = await ownerOfNFT._signTypedData(domain, types_lendOrder, lendOrder);
            let addr = ethers.utils.verifyTypedData(domain, types_lendOrder, lendOrder, flatSig);
            expect(addr).equal(ownerOfNFT.address)
            sig = ethers.utils.splitSignature(flatSig);
            iSig = {
                signature:sig.compact,
                signatureVersion: SignatureVersion.EIP712
            }
            if (lendOrder.price.paymentToken == ethers.constants.AddressZero) {
                await expect(market.connect(renterA).fulfillLendOrder721(lendOrder, iSig, 1, { value: ethers.utils.parseEther('10') })).to.be.revertedWith("invalid cycleAmount");
            } else {
                await expect(market.connect(renterA).fulfillLendOrder721(lendOrder, iSig, 1)).to.be.revertedWith("invalid cycleAmount");
            }
        });

        it("fulfillLendOrder721 should failed if duration > maxDuration", async function () {
            lendOrder.minCycleAmount = 10;
            let flatSig = await ownerOfNFT._signTypedData(domain, types_lendOrder, lendOrder);
            let addr = ethers.utils.verifyTypedData(domain, types_lendOrder, lendOrder, flatSig);
            expect(addr).equal(ownerOfNFT.address)
            sig = ethers.utils.splitSignature(flatSig);
            iSig = {
                signature:sig.compact,
                signatureVersion: SignatureVersion.EIP712
            }
            if (lendOrder.price.paymentToken == ethers.constants.AddressZero) {
                await expect(market.connect(renterA).fulfillLendOrder721(lendOrder, iSig, 181, { value: ethers.utils.parseEther('10') })).to.be.revertedWith("The duration is too long");
            } else {
                await expect(market.connect(renterA).fulfillLendOrder721(lendOrder, iSig, 181)).to.be.revertedWith("The duration is too long");
            }
        });

        it("fulfillLendOrder721 should failed if order expired", async function () {
            let flatSig = await ownerOfNFT._signTypedData(domain, types_lendOrder, lendOrder);
            let addr = ethers.utils.verifyTypedData(domain, types_lendOrder, lendOrder, flatSig);
            expect(addr).equal(ownerOfNFT.address)
            sig = ethers.utils.splitSignature(flatSig);
            iSig = {
                signature:sig.compact,
                signatureVersion: SignatureVersion.EIP712
            }
            await hre.network.provider.send("hardhat_mine", ["0x15180", "0xb4"]);//86400 * 180
            if (lendOrder.price.paymentToken == ethers.constants.AddressZero) {
                await expect(market.connect(renterA).fulfillLendOrder721(lendOrder, iSig, 10, { value: ethers.utils.parseEther('10') })).to.be.revertedWith("invalid RentExpiry");
            } else {
                await expect(market.connect(renterA).fulfillLendOrder721(lendOrder, iSig, 10)).to.be.revertedWith("invalid RentExpiry");
            }
        });

        it("fulfillLendOrder721 should failed if order be canceled", async function () {
            let flatSig = await ownerOfNFT._signTypedData(domain, types_lendOrder, lendOrder);
            let addr = ethers.utils.verifyTypedData(domain, types_lendOrder, lendOrder, flatSig);
            expect(addr).equal(ownerOfNFT.address)
            sig = ethers.utils.splitSignature(flatSig);
            iSig = {
                signature:sig.compact,
                signatureVersion: SignatureVersion.EIP712
            }
            let orderHash = typedDataEncoder_lendOrder.hashStruct('LendOrder', lendOrder);
            await market.connect(renterA).cancelOrder(orderHash);
            if (lendOrder.price.paymentToken == ethers.constants.AddressZero) {
                await expect(market.connect(renterA).fulfillLendOrder721(lendOrder, iSig, 10, { value: ethers.utils.parseEther('10') })).to.be.revertedWith("Be cancelled or fulfilled already");
            } else {
                await expect(market.connect(renterA).fulfillLendOrder721(lendOrder, iSig, 10)).to.be.revertedWith("Be cancelled or fulfilled already");
            }
        });



    });

    describe('ERC721-fulfillRentOffer721', function () {
        let rentOffer_A: RentOffer;
        let rentOffer_B: RentOffer;
        let rentalPrice_ERC20;
        beforeEach(async function () {
            rentalPrice_ERC20 = { paymentToken: erc20.address, pricePerCycle: ethers.utils.parseEther('1'), cycle: 86400 }
            rentOffer_A = {
                maker: renterA.address,
                taker: ethers.constants.AddressZero,
                nft: nft,
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
                nft: nft,
                price: rentalPrice_ERC20,
                cycleAmount: 5,
                offerExpiry: rentOfferExpiry,
                nonce: 0,
                salt: 0,
                fees: [{ rate: 100, recipient: ownerOfMarket.address }],
                metadata: metadata
            }

            erc20.mint(renterA.address, ethers.utils.parseEther('100'));
            erc20.mint(renterB.address, ethers.utils.parseEther('5'));

            erc20.connect(renterA).approve(market.address, ethers.utils.parseEther('100'));
            erc20.connect(renterB).approve(market.address, ethers.utils.parseEther('100'));

        });
        it("_getEIP712Hash vs _TypedDataEncoder.hash", async function () {
            let order_hash_to_sign_local = ethers.utils._TypedDataEncoder.hash(domain, types_rentOffer, rentOffer_A);
            let order_hash_local = typedDataEncoder_rentOffer.hashStruct('RentOffer', rentOffer_A);
            let order_hash_to_sign_chain = await market._getEIP712Hash(order_hash_local);
            expect(order_hash_to_sign_local).equal(order_hash_to_sign_chain);
        });

        it("fulfillRentOffer721 should success", async function () {
            let flatSig = await renterA._signTypedData(domain, types_rentOffer, rentOffer_A);
            let addr = ethers.utils.verifyTypedData(domain, types_rentOffer, rentOffer_A, flatSig);
            expect(addr).equal(renterA.address)
            sig = ethers.utils.splitSignature(flatSig);
            iSig = {
                signature:sig.compact,
                signatureVersion: SignatureVersion.EIP712
            }
            receipt = await market.connect(ownerOfNFT).fulfillRentOffer721(rentOffer_A, iSig, ethers.constants.MaxUint256);

            let data_renterA = await bank_dcl.userInfoOf(TokenType.ERC721,testERC721.address, firstTokenId);
            console.log('user', data_renterA[0]);
            console.log('userExpires', data_renterA[1]);

            expect(data_renterA[0]).equal(renterA.address)

            let flatSig_sublet = await renterB._signTypedData(domain, types_rentOffer, rentOffer_B);
            let addr_sublet = ethers.utils.verifyTypedData(domain, types_rentOffer, rentOffer_B, flatSig_sublet);
            expect(addr_sublet).equal(renterB.address)
            sig = ethers.utils.splitSignature(flatSig_sublet);
            iSig = {
                signature:sig.compact,
                signatureVersion: SignatureVersion.EIP712
            }
            receipt = await market.connect(renterA).fulfillRentOffer721(rentOffer_B, iSig, data_renterA[1]);

            let data_renterB = await bank_dcl.userInfoOf(TokenType.ERC721,testERC721.address, firstTokenId);
            console.log('user', data_renterB[0]);
            console.log('userExpires', data_renterB[1]);

            expect(data_renterB[0]).equal(renterB.address)

        });

        it("fulfillRentOffer721 should fail until last rent expired", async function () {
            let flatSig = await renterA._signTypedData(domain, types_rentOffer, rentOffer_A);
            let addr = ethers.utils.verifyTypedData(domain, types_rentOffer, rentOffer_A, flatSig);
            expect(addr).equal(renterA.address)
            sig = ethers.utils.splitSignature(flatSig);
            iSig = {
                signature:sig.compact,
                signatureVersion: SignatureVersion.EIP712
            }
            receipt = await market.connect(ownerOfNFT).fulfillRentOffer721(rentOffer_A, iSig, ethers.constants.MaxUint256);

            let flatSig_renterB = await renterB._signTypedData(domain, types_rentOffer, rentOffer_B);
            let addr_sublet = ethers.utils.verifyTypedData(domain, types_rentOffer, rentOffer_B, flatSig_renterB);
            expect(addr_sublet).equal(renterB.address)
            sig = ethers.utils.splitSignature(flatSig_renterB);
            iSig = {
                signature:sig.compact,
                signatureVersion: SignatureVersion.EIP712
            }

            await expect(market.connect(ownerOfNFT).fulfillRentOffer721(rentOffer_B, iSig, ethers.constants.MaxUint256)).to.be.revertedWith("invalid duration start");

        });

        it("fulfillRentOffer721 should fail if RentOffer be fulfilled again", async function () {
            let flatSig = await renterA._signTypedData(domain, types_rentOffer, rentOffer_A);
            let addr = ethers.utils.verifyTypedData(domain, types_rentOffer, rentOffer_A, flatSig);
            expect(addr).equal(renterA.address)
            sig = ethers.utils.splitSignature(flatSig);
            iSig = {
                signature:sig.compact,
                signatureVersion: SignatureVersion.EIP712
            }
            receipt = await market.connect(ownerOfNFT).fulfillRentOffer721(rentOffer_A, iSig, ethers.constants.MaxUint256);
            await expect(market.connect(ownerOfNFT).fulfillRentOffer721(rentOffer_A, iSig, ethers.constants.MaxUint256)).to.be.revertedWith("Be cancelled or fulfilled already");
        });

        it("fulfillRentOffer721 should failed if RentOffer be canceled", async function () {
            let flatSig = await renterA._signTypedData(domain, types_rentOffer, rentOffer_A);
            let addr = ethers.utils.verifyTypedData(domain, types_rentOffer, rentOffer_A, flatSig);
            expect(addr).equal(renterA.address)
            sig = ethers.utils.splitSignature(flatSig);
            iSig = {
                signature:sig.compact,
                signatureVersion: SignatureVersion.EIP712
            }
            let offerHash = typedDataEncoder_rentOffer.hashStruct('RentOffer', rentOffer_A);
            await market.connect(renterA).cancelOrder(offerHash);
            await expect(market.connect(ownerOfNFT).fulfillRentOffer721(rentOffer_A, iSig, ethers.constants.MaxUint256)).to.be.revertedWith("Be cancelled or fulfilled already");

        });

        it("fulfillRentOffer721 should failed if struct is signed by other", async function () {
            let flatSig_other = await other._signTypedData(domain, types_rentOffer, rentOffer_A);
            sig = ethers.utils.splitSignature(flatSig_other);
            let iSig_by_other = {
                signature:sig.compact,
                signatureVersion: SignatureVersion.EIP712
            }
            await expect(market.connect(ownerOfNFT).fulfillRentOffer721(rentOffer_A, iSig_by_other, ethers.constants.MaxUint256)).to.be.reverted;

        });

        it("fulfillLendOrder721 should failed if renter don't have enough ERC20", async function () {
            rentOffer_B.cycleAmount = 10;
            let flatSig = await renterB._signTypedData(domain, types_rentOffer, rentOffer_B);
            let addr = ethers.utils.verifyTypedData(domain, types_rentOffer, rentOffer_B, flatSig);
            expect(addr).equal(renterB.address)
            sig = ethers.utils.splitSignature(flatSig);
            iSig = {
                signature:sig.compact,
                signatureVersion: SignatureVersion.EIP712
            }
            await expect(market.connect(ownerOfNFT).fulfillRentOffer721(rentOffer_B, iSig, ethers.constants.MaxUint256)).to.be.revertedWith("ERC20: transfer amount exceeds balance");

        });
        it("fulfillLendOrder721 should failed if renter don't approve enough ERC20", async function () {
            await erc20.mint(renterB.address, ethers.utils.parseEther('99'));
            await erc20.connect(renterB).approve(market.address, ethers.utils.parseEther('0'));
            let flatSig = await renterB._signTypedData(domain, types_rentOffer, rentOffer_B);
            let addr = ethers.utils.verifyTypedData(domain, types_rentOffer, rentOffer_B, flatSig);
            expect(addr).equal(renterB.address)
            sig = ethers.utils.splitSignature(flatSig);
            iSig = {
                signature:sig.compact,
                signatureVersion: SignatureVersion.EIP712
            }
            await expect(market.connect(ownerOfNFT).fulfillRentOffer721(rentOffer_B, iSig, ethers.constants.MaxUint256)).to.be.revertedWith("ERC20: insufficient allowance");
        });


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
                signature:sig.compact,
                signatureVersion: SignatureVersion.EIP712
            }
            if (lendOrder.price.paymentToken == ethers.constants.AddressZero) {
                receipt = await market.connect(renterA).fulfillLendOrder721(lendOrder, iSig, 10, { value: ethers.utils.parseEther('10') });
            } else {
                receipt = await market.connect(renterA).fulfillLendOrder721(lendOrder, iSig, 10);
            }
        });

        it("redeem should success if user is expired", async function () {
            await hre.network.provider.send("hardhat_mine", ["0x15180", "0xb"]);//86400 * 11
            await bank_dcl.connect(ownerOfNFT).redeemNFT721(TokenType.ERC721, testERC721.address, firstTokenId);
            expect(await testERC721.ownerOf(firstTokenId)).equal(ownerOfNFT.address);
        });
        it("redeem should failed if user isn't expired", async function () {
            await expect(bank_dcl.connect(ownerOfNFT).redeemNFT721(TokenType.ERC721, testERC721.address, firstTokenId)).to.be.revertedWith("cannot redeem now");
        });
    });

    describe('incrementNonce will dislist all LendOrders and all RentOffers', function () {
        let rentalPrice_ERC20;
        let rentOffer_A;
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

            rentOffer_A = {
                maker: renterA.address,
                taker: ethers.constants.AddressZero,
                nft: nft,
                price: rentalPrice_ERC20,
                cycleAmount: 10,
                offerExpiry: rentOfferExpiry,
                nonce: 0,
                salt: 0,
                fees: [{ rate: 100, recipient: ownerOfMarket.address }],
                metadata: metadata
            }

            erc20.mint(renterA.address, ethers.utils.parseEther('100'));
            erc20.mint(renterB.address, ethers.utils.parseEther('1'));

            erc20.connect(renterA).approve(market.address, ethers.utils.parseEther('100'));
            erc20.connect(renterB).approve(market.address, ethers.utils.parseEther('100'));


        });

        it("fulfill LendOrder should fail if nonce is incremented", async function () {
            await market.connect(ownerOfNFT).incrementNonce()
            let flatSig = await ownerOfNFT._signTypedData(domain, types_lendOrder, lendOrder);
            let addr = ethers.utils.verifyTypedData(domain, types_lendOrder, lendOrder, flatSig);
            expect(addr).equal(ownerOfNFT.address)
            sig = ethers.utils.splitSignature(flatSig);
            iSig = {
                signature:sig.compact,
                signatureVersion: SignatureVersion.EIP712
            }
            await expect(market.connect(renterA).fulfillLendOrder721(lendOrder, iSig, 10)).to.be.revertedWith("nonce already expired");
        });

        it("fulfillLendOrder721 should failed if nonce is incremented", async function () {
            await market.connect(renterA).incrementNonce()
            let flatSig = await renterA._signTypedData(domain, types_rentOffer, rentOffer_A);
            let addr = ethers.utils.verifyTypedData(domain, types_rentOffer, rentOffer_A, flatSig);
            expect(addr).equal(renterA.address)
            sig = ethers.utils.splitSignature(flatSig);
            iSig = {
                signature:sig.compact,
                signatureVersion: SignatureVersion.EIP712
            }
            await expect(market.connect(ownerOfNFT).fulfillRentOffer721(rentOffer_A, iSig, ethers.constants.MaxUint256)).to.be.revertedWith("nonce already expired");

        });

    });


});

