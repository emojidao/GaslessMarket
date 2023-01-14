import { assert, expect } from "chai";
import { ethers, upgrades } from "hardhat";
import type { BigNumber, Signature, Wallet } from "ethers";
import { NFT, RentalPrice, LendOrder, RentOffer, TokenType, ISignature, SignatureVersion, Metadata } from "./IStructs";
import { types_rentOffer, types_lendOrder } from "./types";
import { domain } from "process";
import hre from "hardhat";
const firstTokenId = 1;
const secondTokenId = 2;



describe("EIP1271 Wallet", function () {
    let ownerOfMarket, adminOfMarket, ownerOfWallet, renterA, renterB, other;
    let testEIP1271Wallet;
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
        [ownerOfMarket, adminOfMarket, ownerOfWallet, renterA, renterB, other] = await ethers.getSigners();

        const EIP1271Wallet = await ethers.getContractFactory("EIP1271Wallet");
        testEIP1271Wallet = await EIP1271Wallet.deploy(ownerOfWallet.address);

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

        await testERC4907.mint(testEIP1271Wallet.address, firstTokenId)
        await testERC4907.mint(testEIP1271Wallet.address, secondTokenId)
        await testEIP1271Wallet.connect(ownerOfWallet).approveNFT(testERC4907.address, bank.address);

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
            maker: testEIP1271Wallet.address,
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

        it("fulfillLendOrder721", async function () {
            let hashToSign = ethers.utils._TypedDataEncoder.hash(domain, types_lendOrder, lendOrder);
            await testEIP1271Wallet.registerDigest(hashToSign,true);

            let flatSig = await ownerOfWallet._signTypedData(domain, types_lendOrder, lendOrder);
            let addr = ethers.utils.verifyTypedData(domain, types_lendOrder, lendOrder, flatSig);
            expect(addr).equal(ownerOfWallet.address)
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
        });


    });







});

