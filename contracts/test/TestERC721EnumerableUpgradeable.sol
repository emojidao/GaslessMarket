// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "./TestERC721Upgradeable.sol";

contract TestERC721EnumerableUpgradeable is
    TestERC721Upgradeable,
    ERC721EnumerableUpgradeable
{
    function _baseURI()
        internal
        view
        virtual
        override(ERC721Upgradeable, TestERC721Upgradeable)
        returns (string memory)
    {
        return _uri;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    )
        internal
        virtual
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
    {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
