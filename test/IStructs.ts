export enum TokenType {
    NATIVE,
    ERC20,
    ERC721,
    ERC4907,
    ERC1155,
    ERC5006
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

