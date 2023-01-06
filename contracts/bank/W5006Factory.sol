// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "../lib/OwnableUpgradeable.sol";
import "../erc5006/IERC5006.sol";
import "../erc5006/IWrappedInERC5006.sol";

abstract contract W5006Factory is OwnableUpgradeable {
    event DeployW5006(address w5006, address originalAddress);

    address public w5006Impl;
    mapping(address => address) public oNFT_w5006;

    function _initW5006(address w5006Impl_) internal {
        require(w5006Impl == address(0));
        w5006Impl = w5006Impl_;
    }

    function setW5006Impl(address w5006Impl_) public onlyAdmin {
        w5006Impl = w5006Impl_;
    }

    function _deployW5006(address oNFT) internal returns (address w5006) {
        w5006 = Clones.clone(w5006Impl);
        IWrappedIn(w5006).initializeWrap(oNFT);
        emit DeployW5006(w5006, oNFT);
    }

    function deployW5006(address oNFT) public {
        require(oNFT_w5006[oNFT] == address(0), "deployed already");
        address w5006 = _deployW5006(oNFT);
        oNFT_w5006[oNFT] = w5006;
        IERC1155(oNFT).setApprovalForAll(w5006, true);
    }

    function registerW5006(address oNFT, address w5006) public onlyAdmin {
        require(oNFT_w5006[oNFT] == address(0), "deployed already");
        require(
            IERC165(w5006).supportsInterface(type(IWrappedIn).interfaceId),
            "not wNFT"
        );
        require(
            IERC165(w5006).supportsInterface(type(IERC5006).interfaceId),
            "not ERC5006"
        );
        require(
            IWrappedInERC5006(w5006).originalAddress() == oNFT,
            "invalid oNFT"
        );
        oNFT_w5006[oNFT] = w5006;
    }

    function w5006Of(address oNFT) public view returns (address) {
        return oNFT_w5006[oNFT];
    }
}
