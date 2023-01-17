import { BigNumber } from "ethers";

export enum TokenType {
    ERC721,
    ERC721_subNFT, //Reserved Field
    ERC721_vNFT, //Reserved Field
    ERC1155,
    ERC4907,
    ERC5006,
    ERC20,
    NATIVE
}

export enum SignatureVersion {
    EIP712,
    EIP1271
}

export interface NFT {
    tokenType: TokenType;
    token: string;
    tokenId;
    amount;
}

export interface Fee {
    rate;
    recipient;
}
export interface Metadata {
    metadataHash;
    checker;
}
export interface RentalPrice {
    paymentToken;
    pricePerCycle;
    cycle;
}

export interface LendOrder {
    maker;
    taker; //private order
    nft: NFT;
    price: RentalPrice;
    minCycleAmount;
    maxRentExpiry;
    nonce;
    salt;
    durationId;
    fees: Fee[];
    metadata: Metadata;
}
export interface RentOffer {
    maker;
    taker; //private order
    nft: NFT;
    price: RentalPrice;
    cycleAmount
    offerExpiry;
    nonce;
    salt;
    fees: Fee[];
    metadata: Metadata;
}

export interface ISignature {
    signature;
    signatureVersion: SignatureVersion
}

export interface IRentingRecord {
    tokenType: TokenType;
    oNFT;
    oNFTId;
    lender;
    recordId;
}

export const MaxUint64 = BigNumber.from("18446744073709551615");
