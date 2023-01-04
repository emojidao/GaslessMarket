// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/Multicall.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../lib/Pauseable.sol";
import "../lib/ENSReverseRegistrar.sol";
import "../bank/IBank.sol";
import "./IRentalMarket.sol";
import "../validater/EIP712.sol";
import "../validater/IMetadataChecker.sol";
import {Fee} from "../constant/BaseStructs.sol";

abstract contract BaseRentalMarket is
    IRentalMarket,
    Pauseable,
    ENSReverseRegistrar,
    ReentrancyGuardUpgradeable,
    Multicall,
    EIP712
{
    /* Storage */
    mapping(bytes32 => bool) internal cancelledOrFulfilled;
    mapping(address => uint256) internal nonces;
    mapping(address => address) internal bandMap;
    address internal _baseBank;
    uint256 internal maxDuration;

    function _initialize(
        address owner_,
        address admin_,
        address baseBank_
    ) internal onlyInitializing {
        __ReentrancyGuard_init();
        _initOwnable(owner_, admin_);
        _baseBank = baseBank_;
        IBank(_baseBank).bindMarket(address(this));
        _hashDomain();
        isPausing = false;
        maxDuration = 86400 * 180;
    }

    function bankOf(address oNFT) public view returns (address) {
        return bandMap[oNFT] == address(0) ? _baseBank : bandMap[oNFT];
    }

    function _registerBank(address oNFT, address bank) internal {
        IBank(bank).bindMarket(address(this));
        bandMap[oNFT] = bank;
    }

    function _cancelOrderOrOffer(bytes32 hash) internal {
        require(
            !cancelledOrFulfilled[hash],
            "Be cancelled or fulfilled already"
        );
        cancelledOrFulfilled[hash] = true;
        emit OrderCancelled(hash);
    }

    function cancelLendOrder(LendOrder calldata lendOrder) public {
        require(msg.sender == lendOrder.maker);
        bytes32 orderHash = _hashStruct_LendOrder(lendOrder);
        _cancelOrderOrOffer(orderHash);
    }

    function cancelRentOffer(RentOffer calldata rentOffer) public {
        require(msg.sender == rentOffer.maker);
        bytes32 offerHash = _hashStruct_RentOffer(rentOffer);
        _cancelOrderOrOffer(offerHash);
    }

    /**
     * @dev Cancel all current orders for a user, preventing them from being matched. Must be called by the trader of the order
     */
    function incrementNonce() external {
        nonces[msg.sender] += 1;
        emit NonceIncremented(msg.sender, nonces[msg.sender]);
    }

    function _distributePayment(
        RentalPrice calldata price,
        uint256 cycleAmount,
        uint256 nftAmount,
        Fee[] calldata fees,
        address lender,
        address renter
    ) internal {
        uint256 totalPrice = price.pricePerCycle * cycleAmount * nftAmount;
        uint16 totalFeesRate;
        for (uint256 i = 0; i < fees.length; i++) {
            totalFeesRate += fees[i].rate;
        }
        uint256 totalFee = (totalPrice * totalFeesRate) / 100_000;
        uint256 leftTotalPrice = totalPrice - totalFee;
        if (price.paymentToken == address(0)) {
            require(msg.value >= totalPrice, "payment is not enough");
            Address.sendValue(payable(lender), leftTotalPrice);
            if (msg.value > totalPrice) {
                Address.sendValue(payable(renter), msg.value - totalPrice);
            }
            for (uint256 i = 0; i < fees.length; i++) {
                Address.sendValue(
                    fees[i].recipient,
                    (totalPrice * fees[i].rate) / 100_000
                );
            }
        } else {
            SafeERC20.safeTransferFrom(
                IERC20(price.paymentToken),
                renter,
                lender,
                leftTotalPrice
            );
            for (uint256 i = 0; i < fees.length; i++) {
                SafeERC20.safeTransferFrom(
                    IERC20(price.paymentToken),
                    renter,
                    fees[i].recipient,
                    (totalPrice * fees[i].rate) / 100_000
                );
            }
        }
    }

    function _validateOrder(
        address maker,
        address taker,
        uint256 nonce,
        bytes32 orderHash
    ) internal view {
        require(taker == address(0) || taker == msg.sender, "invalid taker");
        require(nonce == nonces[maker], "nonce already expired");
        require(
            !cancelledOrFulfilled[orderHash],
            "Be cancelled or fulfilled already"
        );
    }

    function _validateMetadata(NFT calldata nft, Metadata calldata metadata)
        internal
        view
    {
        if (metadata.checker != address(0)) {
            IMetadataChecker(metadata.checker).check(
                nft.token,
                nft.tokenId,
                metadata.metadataHash
            );
        }
    }

}
