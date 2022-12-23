// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./IBank.sol";

abstract contract Bank is IBank {
    address public market;

    modifier onlyMarket() {
        require(msg.sender == market, "only market");
        _;
    }

    function bindMarket(address market_) external {
        require(market == address(0),"market was bind");
        market = market_;
    }
}
