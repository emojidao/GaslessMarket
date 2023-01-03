// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../lib/OwnableUpgradeable.sol";
import "../erc5006/IERC5006.sol";
import "../erc5006/IWrappedInERC5006.sol";

abstract contract W5006Factory is OwnableUpgradeable {
    event DeployW5006(address w5006, address originalAddress);

    address public w5006Impl;

    function _initW5006(address w5006Impl_) internal {
        require(w5006Impl == address(0));
        w5006Impl = w5006Impl_;
    }

    function setW5006Impl(address w5006Impl_) public onlyAdmin {
        w5006Impl = w5006Impl_;
    }

    function _deployW5006(address oNFT)
        internal
        returns (address w5006)
    {
        w5006 = Clones.clone(w5006Impl);
        IWrappedIn(w5006).initializeWrap(oNFT);
        emit DeployW5006(w5006, oNFT);
    }
}
