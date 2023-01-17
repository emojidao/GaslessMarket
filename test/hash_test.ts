// import { expect } from "chai";
// import { ethers } from "hardhat";
// import type { BigNumber, Wallet } from "ethers";
// import { NFT, RentalPrice, LendOrder, TokenType, RentOffer, Metadata } from "./IStructs";
// import { types_rentOffer, types_lendOrder } from "./types";
// import { normalizeSpdxLicenceIdentifiers } from "@ethereum-waffle/compiler";
// const firstTokenId = 1;
// const secondTokenId = 2;

// describe("Hash", function () {
//     let lender, renter, recipientOfFee;
//     let eip712;
//     let testERC721;
//     let nft: NFT;
//     let metadata: Metadata;
//     let metadataChecker721;
//     let rentalPrice: RentalPrice;
//     let lendOrder: LendOrder;
//     let rentOffer: RentOffer;
//     let typedDataEncoder_lendOrder;
//     let typedDataEncoder_rentOffer;

//     beforeEach(async function () {
//         [lender, renter, recipientOfFee] = await ethers.getSigners();
//         const EIP712 = await ethers.getContractFactory("EIP712");
//         eip712 = await EIP712.deploy();

//         const TestERC721 = await ethers.getContractFactory("TestERC721");
//         testERC721 = await TestERC721.deploy();

//         const MetadataChecker721 = await ethers.getContractFactory("MetadataChecker721");
//         metadataChecker721 = await MetadataChecker721.deploy();

//         await testERC721.mint(lender.address, firstTokenId)
//         await testERC721.mint(lender.address, secondTokenId)

//         nft = { tokenType: TokenType.ERC721, token: testERC721.address, tokenId: firstTokenId, amount: 1 }
//         rentalPrice = { paymentToken: ethers.constants.AddressZero, pricePerCycle: ethers.utils.parseEther('1'), cycle: 3600 }
//         metadata = { checker: metadataChecker721.address, metadataHash: ethers.constants.HashZero }
//         lendOrder = {
//             maker: lender.address,
//             taker: ethers.constants.AddressZero,
//             nft: nft,
//             price: rentalPrice,
//             minCycleAmount: 1,
//             maxRentExpiry: 999999999990,
//             nonce: 0,
//             salt: 0,
//             durationId: MaxUint64,
//             fees: [{ rate: 100, recipient: recipientOfFee.address }],
//             metadata: metadata
//         }

//         rentOffer = {
//             maker: renter.address,
//             taker: ethers.constants.AddressZero,
//             nft: nft,
//             price: rentalPrice,
//             cycleAmount: 10,
//             offerExpiry: 9999999990,
//             nonce: 0,
//             salt: 0,
//             fees: [{ rate: 100, recipient: recipientOfFee.address }],
//             metadata: metadata
//         }
//         typedDataEncoder_lendOrder = ethers.utils._TypedDataEncoder.from(types_lendOrder);
//         typedDataEncoder_rentOffer = ethers.utils._TypedDataEncoder.from(types_rentOffer);
//         let type;
//         // type = typedDataEncoder.encodeType('NFT')
//         // console.log('NFT', type);

//         // type = typedDataEncoder.encodeType('RentalPrice')
//         // console.log('RentalPrice', type);
//         type = typedDataEncoder_lendOrder.encodeType('Metadata')
//         console.log('Metadata', type);

//         // type = typedDataEncoder_lendOrder.encodeType('LendOrder')
//         // console.log('LendOrder', type);
//         // type = typedDataEncoder_rentOrder.encodeType('RentOffer')
//         // console.log('RentOffer', type);
//     })

//     describe('hash', function () {
//         let hash_struct_chain = null;
//         let hash_local = null;

//         it("_hashStruct_NFT equal hashStruct_local", async function () {
//             hash_struct_chain = await eip712._hashStruct_NFT(nft);
//             hash_local = typedDataEncoder_lendOrder.hashStruct('NFT', nft);
//             expect(hash_local).equal(hash_struct_chain);
//         });

//         it("_hashStruct_RentalPrice equal hashStruct_local", async function () {
//             hash_struct_chain = await eip712._hashStruct_RentalPrice(rentalPrice);
//             hash_local = typedDataEncoder_lendOrder.hashStruct('RentalPrice', rentalPrice);
//             expect(hash_local).equal(hash_struct_chain);
//         });
//         it("_hashStruct_Metadata equal hashStruct_local", async function () {
//             hash_struct_chain = await eip712._hashStruct_Metadata(metadata);
//             hash_local = typedDataEncoder_lendOrder.hashStruct('Metadata', metadata);
//             let hash_local_2 = typedDataEncoder_rentOffer.hashStruct('Metadata', metadata);
//             expect(hash_local).equal(hash_local_2);
//             expect(hash_local_2).equal(hash_struct_chain);
//         });

//         it("_hashStruct_RentOffer equal hashStruct_local", async function () {
//             hash_struct_chain = await eip712._hashStruct_RentOffer(rentOffer);
//             hash_local = typedDataEncoder_rentOffer.hashStruct('RentOffer', rentOffer);
//             expect(hash_local).equal(hash_struct_chain);
//         });

//         it("_hashStruct_LendOrder equal hashStruct_local", async function () {
//             hash_struct_chain = await eip712._hashStruct_LendOrder(lendOrder);
//             hash_local = typedDataEncoder_lendOrder.hashStruct('LendOrder', lendOrder);
//             expect(hash_local).equal(hash_struct_chain);
//         });

//     });



// });

