// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../lib/OwnableUpgradeable.sol";
import "../erc4907/IERC4907.sol";
import "../erc4907/wrap/IWrapNFTUpgradeable.sol";

contract W4907Factory is OwnableUpgradeable {
    event DeployW4907(
        address w4907,
        string name,
        string symbol,
        address originalAddress
    );

    address public w4907Impl;

    constructor(
        address owner_,
        address admin_,
        address w4907Impl_
    ) {
        initOwnableContract(owner_, admin_);
        w4907Impl = w4907Impl_;
    }

    function setW4907Impl(address w4907Impl_) public onlyAdmin {
        w4907Impl = w4907Impl_;
    }

    function _deployW4907(
        string memory name,
        string memory symbol,
        address originalAddress
    ) internal returns (address w4907) {
        require(
            IERC165(originalAddress).supportsInterface(
                type(IERC721).interfaceId
            ),
            "not ERC721"
        );
        require(
            !IERC165(originalAddress).supportsInterface(
                type(IERC4907).interfaceId
            ),
            "the NFT is IERC4907 already"
        );
        w4907 = Clones.clone(w4907Impl);
        IWrapNFTUpgradeable(w4907).initialize(
            name,
            symbol,
            originalAddress,
            address(this)
        );
        emit DeployW4907(address(w4907), name, symbol, originalAddress);
    }
}
