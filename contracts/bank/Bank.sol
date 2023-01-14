// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "./IBank.sol";

abstract contract Bank is Initializable, IBank {
    address public market;

    modifier onlyMarket() {
        require(msg.sender == market, "only market");
        _;
    }

    function bindMarket(address market_) external {
        require(market == address(0), "market was bind");
        require(market_ != address(0), "market cannot be Zero Address");
        market = market_;
    }
}
