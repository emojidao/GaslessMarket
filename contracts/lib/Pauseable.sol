// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;
import "./OwnableUpgradeable.sol";

abstract contract Pauseable is OwnableUpgradeable {
    event Paused(address account);
    event Unpaused(address account);
    bool public isPausing;

    modifier whenNotPaused() {
        require(!isPausing, "Pausable: paused");
        _;
    }

    function setPause(bool pause_) external onlyAdmin {
        isPausing = pause_;
        if (isPausing) {
            emit Paused(address(this));
        } else {
            emit Unpaused(address(this));
        }
    }
}
