// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./Bank.sol";
import "./IBank721.sol";
import "./W4907Factory.sol";
import "../erc4907/wrap/IWrapNFT.sol";
import "../erc4907/IERC4907.sol";

contract Bank721 is Bank, W4907Factory, IBank721 {
    mapping(address => address) public oNFT_w4907;
    //      nft                 nftId      from
    mapping(address => mapping(uint256 => address)) public staked;
    mapping(bytes32 => Duration) public durations;

    constructor(
        address owner_,
        address admin_,
        address wNFTImpl_
    ) W4907Factory(owner_, admin_, wNFTImpl_) {}

    function tryStakeNFT721(
        TokenType tokenType,
        address oNFT,
        uint256 oNFTId,
        address from
    ) public onlyMarket {
        if (staked[oNFT][oNFTId] == address(0)) {
            staked[oNFT][oNFTId] = from;
            if (tokenType == TokenType.ERC721) {
                address wNFT = oNFT_w4907[oNFT];
                require(wNFT != address(0), "wNFT is not deployed yet");
                IWrapNFT(wNFT).stake(oNFTId, from, address(this));
            } else {
                IERC721(oNFT).transferFrom(from, address(this), oNFTId);
            }
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
        if (tokenType == TokenType.ERC721) {
            address w4907 = oNFT_w4907[oNFT];
            IWrapNFT(w4907).redeem(oNFTId, staked[oNFT][oNFTId]);
        } else {
            IERC721(oNFT).transferFrom(
                address(this),
                staked[oNFT][oNFTId],
                oNFTId
            );
        }
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
        if (nft.tokenType == TokenType.ERC721) {
            address w4907 = oNFT_w4907[nft.token];
            require(w4907 != address(0), "wNFT is not deployed yet");
            IERC4907(w4907).setUser(nft.tokenId, renter, uint64(expiry));
        } else {
            IERC4907(nft.token).setUser(nft.tokenId, renter, uint64(expiry));
        }
    }

    function userInfoOf(
        TokenType tokenType,
        address oNFT,
        uint256 oNFTId
    ) public view returns (address user, uint256 userExpires) {
        if (tokenType == TokenType.ERC721) {
            address w4907 = oNFT_w4907[oNFT];
            require(w4907 != address(0), "wNFT is not deployed yet");
            user = IERC4907(w4907).userOf(oNFTId);
            userExpires = IERC4907(w4907).userExpires(oNFTId);
        } else {
            user = IERC4907(oNFT).userOf(oNFTId);
            userExpires = IERC4907(oNFT).userExpires(oNFTId);
        }
    }

    function deployW4907(
        string memory name,
        string memory symbol,
        address oNFT
    ) public {
        require(oNFT_w4907[oNFT] == address(0), "w4907 is already exists");
        address w4907 = _deployW4907(name, symbol, oNFT);
        oNFT_w4907[oNFT] = w4907;
    }

    function registerW4907(address oNFT, address w4907) public onlyAdmin {
        require(oNFT_w4907[oNFT] == address(0), "w4907 is already exists");
        require(
            IERC165(w4907).supportsInterface(type(IWrapNFT).interfaceId),
            "not wNFT"
        );
        require(
            IERC165(w4907).supportsInterface(type(IERC4907).interfaceId),
            "not ERC4907"
        );
        require(IWrapNFT(w4907).originalAddress() == oNFT, "invalid oNFT");
        oNFT_w4907[oNFT] = w4907;
    }

    function w4907Of(address oNFT) public view returns (address) {
        return oNFT_w4907[oNFT];
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
                (address user, uint256 userExpires) = userInfoOf(
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
