// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract TestERC1155 is ERC1155 {
    using Strings for uint256;
    string internal _uri;
    constructor() ERC1155("") {}

    function mint(address to, uint256 tokenId,uint256 amount) public {
        _mint(to, tokenId, amount, "");
    }

    function uri(uint256 id)
        public
        view
        override
        returns (string memory)
    {
        return bytes(_uri).length > 0 ? string(abi.encodePacked(_uri, id.toString())) : "";
    }

    function setURI(string memory uri_) public {
        _uri = uri_;
    }
}
