// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../Bank.sol";
import "../IBank721.sol";
import "./IDCL.sol";
import "../../lib/OwnableUpgradeable.sol";

contract BankDCL is Bank, IBank721, OwnableUpgradeable {
    struct CheckInData {
        address user;
        uint64 expiredAt;
    }
    mapping(address => mapping(uint256 => CheckInData)) public checkInMap;
    //      nft                 nftId      from
    mapping(address => mapping(uint256 => address)) public staked;
    mapping(bytes32 => Duration) public durations;

    constructor(address owner_, address admin_) {
        _initOwnable(owner_, admin_);
    }

    function tryStakeNFT721(
        TokenType tokenType,
        address oNFT,
        uint256 oNFTId,
        address from
    ) public onlyMarket {
        if (staked[oNFT][oNFTId] == address(0)) {
            staked[oNFT][oNFTId] = from;
            IERC721(oNFT).transferFrom(from, address(this), oNFTId);
        }
    }

    //TODO 未考虑mint vNFT的情况
    function redeemNFT721(
        TokenType tokenType,
        address oNFT,
        uint256 oNFTId
    ) public {
        bytes32 key = keccak256(abi.encode(oNFT, oNFTId, type(uint256).max));
        require(durations[key].start < block.timestamp, "cannot redeem now");
        IERC721(oNFT).transferFrom(address(this), staked[oNFT][oNFTId], oNFTId);
        delete staked[oNFT][oNFTId];
        delete durations[key];
    }

    function setUser(
        NFT calldata nft,
        address lender,
        address renter,
        uint256 expiry,
        uint256 durationId
    ) external onlyMarket {
        _updateDuration(nft, durationId, lender, expiry + 1);
        IDCL(nft.token).setUpdateOperator(nft.tokenId, renter);
        checkInMap[nft.token][nft.tokenId] = CheckInData(
            renter,
            uint64(expiry)
        );
    }

    function isExpired(address oNFT, uint256 oNFTId)
        public
        view
        returns (bool)
    {
        return checkInMap[oNFT][oNFTId].expiredAt < block.timestamp;
    }

    function resetExpiredTo(
        address[] memory oNFTs,
        uint256[] memory oNFTIds,
        address to
    ) public virtual onlyAdmin {
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
    ) public view returns (address user, uint256 userExpires) {
        user = IDCL(oNFT).updateOperator(oNFTId);
        if (user == checkInMap[oNFT][oNFTId].user) {
            userExpires = checkInMap[oNFT][oNFTId].expiredAt;
        }
    }

    function checkInOf(address oNFT, uint256 oNFTId)
        public
        view
        returns (address user, uint256 userExpires)
    {
        user = checkInMap[oNFT][oNFTId].user;
        userExpires = checkInMap[oNFT][oNFTId].expiredAt;
    }

    function _getDurationKey(NFT calldata nft, uint256 durationId)
        internal
        pure
        returns (bytes32 key)
    {
        key = keccak256(abi.encode(nft.token, nft.tokenId, durationId));
    }

    function _updateDuration(
        NFT calldata nft,
        uint256 durationId,
        address lender,
        uint256 start
    ) internal returns (bytes32 key) {
        key = _getDurationKey(nft, durationId);
        if (durations[key].start == 0) {
            if (durationId == type(uint256).max) {
                tryStakeNFT721(nft.tokenType, nft.token, nft.tokenId, lender);
            } else {
                address user;
                uint256 userExpires;
                (user, userExpires) = userInfoOf(
                    nft.tokenType,
                    nft.token,
                    nft.tokenId
                );
                require(userExpires == durationId, "invalid durationId");
                require(user == lender, "invalid order lender");
            }
            durations[key].owner = lender;
        } else {
            require(durations[key].owner == lender, "invalid order lender");
            require(
                durations[key].start <= block.timestamp,
                "invalid duration start"
            );
        }
        require(start > durations[key].start);
        durations[key].start = uint40(start);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override
        returns (bool)
    {
        return interfaceId == type(IBank721).interfaceId;
    }
}
