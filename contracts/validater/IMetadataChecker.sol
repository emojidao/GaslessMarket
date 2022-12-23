// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

interface IMetadataChecker {
    function check(
        address nft721,
        uint256 nftId,
        bytes32 metadataHash
    ) external view returns (bool);
}
