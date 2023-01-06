// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./BaseBank721.sol";
import "./W4907Factory.sol";

contract Bank721 is BaseBank721, W4907Factory  {
    function initialize(
        address owner_,
        address admin_,
        address w4907Impl_
    ) public initializer {
        _initOwnable(owner_, admin_);
        _initW4907(w4907Impl_);
    }

    function tryStakeNFT721(
        TokenType tokenType,
        address oNFT,
        uint256 oNFTId,
        address from
    ) public virtual override onlyMarket {
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

    function redeemNFT721(
        TokenType tokenType,
        address oNFT,
        uint256 oNFTId
    ) public virtual override{
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


    function _setUser(
        NFT calldata nft,
        address user,
        uint256 expiry
    ) internal virtual override{
        if (nft.tokenType == TokenType.ERC721) {
            address w4907 = oNFT_w4907[nft.token];
            require(w4907 != address(0), "wNFT is not deployed yet");
            IERC4907(w4907).setUser(nft.tokenId, user, uint64(expiry));
        } else {
            IERC4907(nft.token).setUser(nft.tokenId, user, uint64(expiry));
        }
    }

    function userInfoOf(
        TokenType tokenType,
        address oNFT,
        uint256 oNFTId
    ) public view virtual override returns (address user, uint256 userExpires) {
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

}
