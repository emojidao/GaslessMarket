// SPDX-License-Identifier: CC0-1.0

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

    function redeemNFT721(TokenType tokenType, address oNFT, uint256 oNFTId) public virtual override nonReentrant {
        bytes32 key = keccak256(abi.encode(oNFT, oNFTId, type(uint64).max));
        require(msg.sender == durations[key].owner || msg.sender == market, "only owner or market");
        require(durations[key].start < block.timestamp, "cannot redeem now");
        IERC721(oNFT).transferFrom(address(this), staked[oNFT][oNFTId], oNFTId);
        delete staked[oNFT][oNFTId];
        delete durations[key];
    }

    function _setUser(NFT calldata nft, address user, uint64 expiry) internal virtual override {
        IDCL(nft.token).setUpdateOperator(nft.tokenId, user);
        checkInMap[nft.token][nft.tokenId] = CheckInData(user, expiry);
    }

    function isExpired(address oNFT, uint256 oNFTId) public view returns (bool) {
        return checkInMap[oNFT][oNFTId].expiredAt < block.timestamp;
    }

    function resetExpiredTo(address[] memory oNFTs, uint256[] memory oNFTIds, address to) public onlyAdmin {
        for (uint256 index = 0; index < oNFTIds.length; index++) {
            address oNFT = oNFTs[index];
            uint256 oNFTId = oNFTIds[index];
            if (isExpired(oNFT, oNFTId)) {
                IDCL(oNFT).setUpdateOperator(oNFTId, to);
            }
        }
    }

    function setUpdateOperator(address oNFT, uint256 oNFTId, address to, uint64 durationId) external virtual {
        bytes32 key = keccak256(abi.encode(oNFT, oNFTId, durationId));
        require(block.timestamp <= durationId, "Invalid durationId");
        if (durations[key].start > 0) {
            require(durations[key].owner == msg.sender, "Invalid caller");
            require(durations[key].start <= block.timestamp, "Invalid duration start");
        } else {
            require(checkInMap[oNFT][oNFTId].user == msg.sender, "Invalid caller");
            require(checkInMap[oNFT][oNFTId].expiredAt == durationId, "Invalid durationId");
        }
        IDCL(oNFT).setUpdateOperator(oNFTId, to);
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

    function checkInOf(address oNFT, uint256 oNFTId) public view returns (address user, uint256 userExpires) {
        user = checkInMap[oNFT][oNFTId].user;
        userExpires = checkInMap[oNFT][oNFTId].expiredAt;
    }
}
