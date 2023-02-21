// SPDX-License-Identifier: CC0-1.0
pragma solidity 0.8.13;
import "./IMetadataChecker.sol";

contract MetadataChecker721 is IMetadataChecker {
    function check(
        address nft721,
        uint256 nftId,
        bytes32 metadataHash
    ) public view returns (bool) {
        bytes memory data = abi.encodeWithSignature("tokenURI(uint256)", nftId);
        (bool success, bytes memory returndata) = nft721.staticcall(data);
        return success && metadataHash == keccak256(returndata);
    }
}
