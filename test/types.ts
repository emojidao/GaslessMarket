export const types_lendOrder = {
    Fee: [
        {
            "name": "rate",
            "type": "uint16"
        },
        {
            "name": "recipient",
            "type": "address"
        }
    ],
    Metadata: [
        {
            "name": "metadataHash",
            "type": "bytes32"
        },
        {
            "name": "checker",
            "type": "address"
        }
    ],
    NFT: [
        {
            "name": "tokenType",
            "type": "uint8"
        },
        {
            "name": "token",
            "type": "address"
        },
        {
            "name": "tokenId",
            "type": "uint256"
        },
        {
            "name": "amount",
            "type": "uint256"
        }
    ],
    RentalPrice: [
        {
            "name": "paymentToken",
            "type": "address"
        },
        {
            "name": "pricePerCycle",
            "type": "uint256"
        },
        {
            "name": "cycle",
            "type": "uint256"
        }
    ],

    LendOrder: [
        {
            "name": "maker",
            "type": "address"
        },
        {
            "name": "taker",
            "type": "address"
        },
        {
            "name": "nft",
            "type": "NFT"
        },
        {
            "name": "price",
            "type": "RentalPrice"
        },
        {
            "name": "minCycleAmount",
            "type": "uint256"
        },
        {
            "name": "maxRentExpiry",
            "type": "uint256"
        },
        {
            "name": "nonce",
            "type": "uint256"
        },
        {
            "name": "salt",
            "type": "uint256"
        },
        {
            "name": "durationId",
            "type": "uint64"
        },
        {
            "name": "fees",
            "type": "Fee[]"
        },
        {
            "name": "metadata",
            "type": "Metadata"
        }
    ]
};

export const types_rentOffer = {
    Fee: [
        {
            "name": "rate",
            "type": "uint16"
        },
        {
            "name": "recipient",
            "type": "address"
        }
    ],
    Metadata: [
        {
            "name": "metadataHash",
            "type": "bytes32"
        },
        {
            "name": "checker",
            "type": "address"
        }
    ],
    NFT: [
        {
            "name": "tokenType",
            "type": "uint8"
        },
        {
            "name": "token",
            "type": "address"
        },
        {
            "name": "tokenId",
            "type": "uint256"
        },
        {
            "name": "amount",
            "type": "uint256"
        }
    ],
   
    RentalPrice: [
        {
            "name": "paymentToken",
            "type": "address"
        },
        {
            "name": "pricePerCycle",
            "type": "uint256"
        },
        {
            "name": "cycle",
            "type": "uint256"
        }
    ],

    RentOffer: [
        {
            "name": "maker",
            "type": "address"
        },
        {
            "name": "taker",
            "type": "address"
        },
        {
            "name": "nft",
            "type": "NFT"
        },
        {
            "name": "price",
            "type": "RentalPrice"
        },
        {
            "name": "cycleAmount",
            "type": "uint256"
        },
        {
            "name": "offerExpiry",
            "type": "uint256"
        },
        {
            "name": "nonce",
            "type": "uint256"
        },
        {
            "name": "salt",
            "type": "uint256"
        },
        {
            "name": "fees",
            "type": "Fee[]"
        },
        {
            "name": "metadata",
            "type": "Metadata"
        }
    ]
};
