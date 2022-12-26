// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {LendOrder, RentOffer} from "../constant/RentalStructs.sol";
import "./BaseRentalMarket.sol";
import "./IRentalMarket721.sol";
import "../erc4907/IERC4907.sol";
import "../bank/IBank721.sol";

contract RentalMarket721 is BaseRentalMarket, IRentalMarket721 {
    function initialize(
        address owner_,
        address admin_,
        address bank_
    ) public initializer {
        require(IBank(bank_).supportsInterface(type(IBank721).interfaceId));
        _initialize(owner_, admin_, bank_);
    }

    function registerBank(address oNFT, address bank) external onlyAdmin {
        require(IBank(bank).supportsInterface(type(IBank721).interfaceId));
        _registerBank(oNFT, bank);
    }

    function fulfillLendOrder721(
        LendOrder calldata lendOrder,
        Signature calldata signature,
        uint256 cycleAmount
    ) external payable {
        require(cycleAmount >= lendOrder.minCycleAmount, "invalid cycleAmount");
        bytes32 orderHash = _hashStruct_LendOrder(lendOrder);
        _validateOrder(
            lendOrder.maker,
            lendOrder.taker,
            lendOrder.nonce,
            orderHash
        );
        _validateMetadata(lendOrder.nft, lendOrder.metadata);
        _validateSignature(lendOrder.maker, orderHash, signature);
        uint256 duration = lendOrder.price.cycle * cycleAmount;
        require(duration <= maxDuration, "The duration is too long");
        uint256 rentExpiry = block.timestamp + duration;
        require(rentExpiry <= lendOrder.maxRentExpiry, "invalid RentExpiry");
        require(rentExpiry < lendOrder.durationId, "invalid durationId");
        
        IBank721(bankOf(lendOrder.nft.token)).setUser(
            lendOrder.nft,
            lendOrder.maker,
            msg.sender,
            rentExpiry,
            lendOrder.durationId
        );

        _distributePayment(
            lendOrder.price,
            cycleAmount,
            1,
            lendOrder.fees,
            lendOrder.maker,
            msg.sender
        );

        emit LendOrderFulfilled(
            orderHash,
            lendOrder.nft,
            lendOrder.price,
            1,
            cycleAmount,
            lendOrder.maker,
            msg.sender
        );
    }

    function fulfillRentOffer721(
        RentOffer calldata rentOffer,
        Signature calldata signature,
        uint256 durationId
    ) public {
        bytes32 offerHash = _hashStruct_RentOffer(rentOffer);
        _validateOrder(
            rentOffer.maker,
            rentOffer.taker,
            rentOffer.nonce,
            offerHash
        );
        _validateMetadata(rentOffer.nft, rentOffer.metadata);
        require(
            block.timestamp <= rentOffer.offerExpiry,
            "The offer has expired"
        );
        _validateSignature(rentOffer.maker, offerHash, signature);

        uint256 duration = rentOffer.price.cycle * rentOffer.cycleAmount;
        require(duration <= maxDuration, "The duration is too long");
        uint256 rentExpiry = block.timestamp + duration;
        IBank721(bankOf(rentOffer.nft.token)).setUser(
            rentOffer.nft,
            msg.sender,
            rentOffer.maker,
            rentExpiry,
            durationId
        );

        _distributePayment(
            rentOffer.price,
            rentOffer.cycleAmount,
            1,
            rentOffer.fees,
            msg.sender,
            rentOffer.maker
        );
        cancelledOrFulfilled[offerHash] = true;
        emit RentOfferFulfilled(
            offerHash,
            rentOffer.nft,
            rentOffer.price,
            1,
            rentOffer.cycleAmount,
            msg.sender,
            rentOffer.maker
        );
    }
}
