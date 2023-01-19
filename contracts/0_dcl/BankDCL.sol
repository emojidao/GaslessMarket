// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../lib/OwnableUpgradeable.sol";
import "../bank/BaseBank721.sol";
import "./IDCL.sol";

contract BankDCL is OwnableUpgradeable, BaseBank721 {
    struct CheckInData {
        address user;
        uint64 expiredAt;
    }
    mapping(address => mapping(uint256 => CheckInData)) public checkInMap;

    constructor() {
        _disableInitializers();
    }

    function initialize(address owner_, address admin_) public initializer {
        _initOwnable(owner_, admin_);
    }

    function tryStakeNFT721(
        TokenType tokenType,
        address oNFT,
        uint256 oNFTId,
        address from
    ) public virtual override onlyMarket {
        if (staked[oNFT][oNFTId] == address(0)) {
            staked[oNFT][oNFTId] = from;
            IERC721(oNFT).transferFrom(from, address(this), oNFTId);
        }
    }

    function redeemNFT721(
        TokenType tokenType,
        address oNFT,
        uint256 oNFTId
    ) public virtual override nonReentrant{
        bytes32 key = keccak256(abi.encode(oNFT, oNFTId, type(uint64).max));
        require(durations[key].owner == msg.sender, "only owner");
        require(durations[key].start < block.timestamp, "cannot redeem now");
        IERC721(oNFT).transferFrom(address(this), staked[oNFT][oNFTId], oNFTId);
        delete staked[oNFT][oNFTId];
        delete durations[key];
    }

    function _setUser(
        NFT calldata nft,
        address user,
        uint64 expiry
    ) internal virtual override {
        IDCL(nft.token).setUpdateOperator(nft.tokenId, user);
        checkInMap[nft.token][nft.tokenId] = CheckInData(user, expiry);
    }

    function isExpired(
        address oNFT,
        uint256 oNFTId
    ) public view returns (bool) {
        return checkInMap[oNFT][oNFTId].expiredAt < block.timestamp;
    }

    function resetExpiredTo(
        address[] memory oNFTs,
        uint256[] memory oNFTIds,
        address to
    ) public onlyAdmin {
        for (uint256 index = 0; index < oNFTIds.length; index++) {
            address oNFT = oNFTs[index];
            uint256 oNFTId = oNFTIds[index];
            if (isExpired(oNFT, oNFTId)) {
                IDCL(oNFT).setUpdateOperator(oNFTId, to);
                checkInMap[oNFT][oNFTId] = CheckInData(to, 0);
            }
        }
    }

    function userInfoOf(
        TokenType tokenType,
        address oNFT,
        uint256 oNFTId
    ) public view virtual override returns (address user, uint256 userExpires) {
        user = IDCL(oNFT).updateOperator(oNFTId);
        if (user == checkInMap[oNFT][oNFTId].user) {
            userExpires = checkInMap[oNFT][oNFTId].expiredAt;
        }
    }

    function checkInOf(
        address oNFT,
        uint256 oNFTId
    ) public view returns (address user, uint256 userExpires) {
        user = checkInMap[oNFT][oNFTId].user;
        userExpires = checkInMap[oNFT][oNFTId].expiredAt;
    }
}
