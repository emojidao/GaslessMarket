// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "./ITestNFTInit.sol";
contract TestERC721Upgradeable is ERC721Upgradeable ,ITestNFTInit{
    uint256 private _id;
    string internal _uri;

    function initialize(
        string memory name_,
        string memory symbol_,
        string memory uri_
    ) public initializer {
        __ERC721_init(name_, symbol_);
        _uri = uri_;
    }

    function mint() public {
        _id++;
        _mint(msg.sender, _id);
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _uri;
    }

    function setURI(string memory uri_) public {
        _uri = uri_;
    }
}
