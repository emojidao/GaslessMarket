// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.0;
import "contracts/erc4907/wrap/WrappedInERC4907Upgradeable.sol";
import "contracts/erc5006/WrappedInERC5006.sol";

contract TestInterfaceId {
    constructor() {}

    function interfaceIdOf() public pure returns (bytes4[] memory ids) {
        ids = new bytes4[](9);
        ids[0] = type(IWrapNFT).interfaceId;
        ids[1] = type(IERC4907).interfaceId;
        ids[2] = type(IERC721).interfaceId;
        ids[3] = type(IERC721Upgradeable).interfaceId;
        ids[4] = type(IERC721MetadataUpgradeable).interfaceId;
        ids[5] = type(IERC165Upgradeable).interfaceId;
        ids[6] = type(IWrappedIn).interfaceId;
        ids[7] = type(IERC5006).interfaceId;
        ids[8] = type(IWrappedInERC5006).interfaceId;
    }
}
