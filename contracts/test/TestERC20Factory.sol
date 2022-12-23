// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./TestERC20.sol";

contract TestERC20Factory {
    event DeployFT(string _symbol,uint8 decimals_,TestERC20 ft);
    constructor(){}

    function deployFT(string memory _symbol,uint8 decimals_) public {
        TestERC20 ft = new TestERC20(_symbol,_symbol,decimals_);
        emit DeployFT(_symbol,decimals_, ft);
    }
}
