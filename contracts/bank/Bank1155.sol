// SPDX-License-Identifier: CC0-1.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Receiver.sol";
import "./Bank.sol";
import "./IBank1155.sol";
import "./W5006Factory.sol";

contract Bank1155 is Bank, W5006Factory, ERC1155Receiver, IBank1155 {
    //               total amount
    mapping(bytes32 => uint256) internal frozenAmountMap;
    //                  lender & amount
    mapping(bytes32 => Renting) internal rentingMap;

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address owner_,
        address admin_,
        address w5006Impl_
    ) public initializer {
        _initOwnable(owner_, admin_);
        _initW5006(w5006Impl_);
    }

    function _get5006(
        TokenType tokenType,
        address oNFT
    ) internal view returns (address addr5006) {
        if (tokenType == TokenType.ERC5006) {
            addr5006 = oNFT;
        } else if (tokenType == TokenType.ERC1155) {
            addr5006 = oNFT_w5006[oNFT];
            if (addr5006 == address(0)) {
                revert("w5006 is not deployed");
            }
        } else {
            revert("invalid token type");
        }
    }

    function _frozenKey(
        address oNFT,
        uint256 oNFTId,
        address from
    ) internal pure returns (bytes32 key) {
        key = keccak256(abi.encode(oNFT, oNFTId, from));
    }

    function _rentingKey(
        address oNFT,
        uint256 oNFTId,
        address lender,
        uint256 recordId
    ) internal pure returns (bytes32 key) {
        key = keccak256(abi.encode(oNFT, oNFTId, lender, recordId));
    }

    function frozenAmountOf(
        address oNFT,
        uint256 oNFTId,
        address from
    ) external view returns (uint256) {
        bytes32 fkey = _frozenKey(oNFT, oNFTId, from);
        return frozenAmountMap[fkey];
    }

    function createUserRecord(RecordParam memory param) external onlyMarket {
        IERC1155(param.oNFT).safeTransferFrom(
            param.owner,
            address(this),
            param.oNFTId,
            param.oNFTAmount,
            ""
        );

        address addr5006 = _get5006(param.tokenType, param.oNFT);
        uint256 recordId;
        if (param.tokenType == TokenType.ERC5006) {
            recordId = IERC5006(addr5006).createUserRecord(
                address(this),
                param.user,
                param.oNFTId,
                SafeCast.toUint64(param.oNFTAmount),
                SafeCast.toUint64(param.expiry)
            );
        } else if (param.tokenType == TokenType.ERC1155) {
            recordId = IWrappedInERC5006(addr5006).stakeAndCreateUserRecord(
                param.oNFTId,
                SafeCast.toUint64(param.oNFTAmount),
                param.user,
                SafeCast.toUint64(param.expiry)
            );
        }

        param.recordId = recordId;
        bytes32 rentingKey = _rentingKey(
            param.oNFT,
            param.oNFTId,
            param.owner,
            recordId
        );
        rentingMap[rentingKey] = Renting(param.owner, param.oNFTAmount);
        bytes32 fkey = _frozenKey(param.oNFT, param.oNFTId, param.owner);
        frozenAmountMap[fkey] += param.oNFTAmount;
        emit CreateUserRecord(param);
    }

    function _deleteUserRecord(RentingRecord calldata param) internal {
        address addr5006 = _get5006(param.tokenType, param.oNFT);
        IERC5006.UserRecord memory record = IERC5006(addr5006).userRecordOf(
            param.recordId
        );
        if (record.amount == 0) return;
        if (record.expiry > block.timestamp) return;
        bytes32 rentingKey = _rentingKey(
            param.oNFT,
            param.oNFTId,
            param.lender,
            param.recordId
        );
        require(
            rentingMap[rentingKey].lender == param.lender,
            "invalid lender"
        );
        require(
            rentingMap[rentingKey].amount == record.amount,
            "invalid amount"
        );
        if (param.tokenType == TokenType.ERC1155) {
            IWrappedInERC5006(addr5006).redeemRecord(
                param.recordId,
                param.lender
            );
        } else {
            IERC5006(addr5006).deleteUserRecord(param.recordId);
            IERC1155(param.oNFT).safeTransferFrom(
                address(this),
                param.lender,
                record.tokenId,
                record.amount,
                ""
            );
        }

        bytes32 fkey = _frozenKey(param.oNFT, param.oNFTId, param.lender);
        frozenAmountMap[fkey] -= record.amount;
        delete rentingMap[rentingKey];
        emit DeleteUserRecord(param);
    }

    function deleteUserRecords(RentingRecord[] calldata toDeletes) external nonReentrant{
        for (uint256 i = 0; i < toDeletes.length; i++) {
            _deleteUserRecord(toDeletes[i]);
        }
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(IERC165, ERC1155Receiver) returns (bool) {
        return
            interfaceId == type(IBank1155).interfaceId ||
            ERC1155Receiver.supportsInterface(interfaceId);
    }

    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external pure override returns (bytes4) {
        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external pure override returns (bytes4) {
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }
}
