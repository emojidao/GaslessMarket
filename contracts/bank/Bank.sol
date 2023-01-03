// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./IBank.sol";

abstract contract Bank is UUPSUpgradeable,IBank {
    address public market;

    modifier onlyMarket() {
        require(msg.sender == market, "only market");
        _;
    }

    function bindMarket(address market_) external {
        require(market == address(0),"market was bind");
        market = market_;
    }

    // required by the OZ UUPS module
    function _authorizeUpgrade(address) internal override {}
}
