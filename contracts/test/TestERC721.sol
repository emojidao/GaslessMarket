// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract TestERC721 is ERC721 {
    string private _uri;

    constructor() ERC721("", "") {}

    function mint(address to, uint256 tokenId) public {
        _mint(to, tokenId);
    }

    function burn(uint256 tokenId) public {
        require(
            _isApprovedOrOwner(_msgSender(), tokenId),
            "ERC721: caller is not token owner nor approved"
        );
        _burn(tokenId);
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _uri;
    }

    function setURI(string calldata uri_) public {
        _uri = uri_;
    }
}
