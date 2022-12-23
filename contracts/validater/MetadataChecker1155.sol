// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;
import "./IMetadataChecker.sol";

contract MetadataChecker1155 is IMetadataChecker {
    function check(
        address nft1155,
        uint256 nftId,
        bytes32 metadataHash
    ) public view returns (bool) {
        bytes memory data = abi.encodeWithSignature("uri(uint256)", nftId);
        (bool success, bytes memory returndata) = nft1155.staticcall(data);
        return success && metadataHash == keccak256(returndata);
    }
}
