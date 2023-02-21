// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.0;

import "../erc4907/ERC4907Upgradeable.sol";
import "./TestERC721Upgradeable.sol";

contract TestERC4907Upgradeable is ERC4907Upgradeable {
    function initialize(string memory name_, string memory symbol_)
        public
        initializer
    {
        __ERC721_init(name_, symbol_);
    }

    function mint(address to, uint256 tokenId) public {
        _mint(to, tokenId);
    }

    function burn(uint256 tokenId) public {
        require(
            _isApprovedOrOwner(_msgSender(), tokenId),
            "ERC721: caller is not owner nor approved"
        );
        _burn(tokenId);
    }
}
